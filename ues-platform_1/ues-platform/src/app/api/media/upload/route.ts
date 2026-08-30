import { NextResponse } from "next/server";
import { adminStorage, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Try Firebase Admin Storage (production-grade Google Cloud CDN)
    if (isFirebaseAdminConfigured) {
      try {
        console.log("Uploading file to Firebase Admin Storage...", file.name, file.size);
        const bucket = adminStorage.bucket();
        const filename = `posts/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const fileRef = bucket.file(filename);

        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
          },
        });

        let publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        try {
          // Make the file publicly readable so Facebook/Instagram CDNs can fetch it
          await fileRef.makePublic();
          console.log("Successfully made GCS file public. URL:", publicUrl);
        } catch (pubErr: any) {
          console.warn("GCS makePublic failed (potentially due to Uniform bucket access). Generating Signed URL fallback...", pubErr?.message || pubErr);
          const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
          });
          publicUrl = signedUrl;
          console.log("Successfully generated GCS Signed URL fallback. URL:", publicUrl);
        }
        
        return NextResponse.json({ url: publicUrl });
      } catch (storageErr: any) {
        console.warn("Firebase Admin Storage upload failed, falling back to Litterbox:", storageErr?.message || storageErr);
      }
    }

    // 2. Fallback to Litterbox (highly reliable, returns direct download URL with range request support)
    const uploadForm = new FormData();
    uploadForm.append("reqtype", "fileupload");
    uploadForm.append("time", "1h");
    uploadForm.append("fileToUpload", new Blob([buffer], { type: file.type }), file.name);

    console.log("Uploading file to Litterbox from server side...", file.name, file.size);
    const response = await fetch("https://litterbox.catbox.moe/resources/api.php", {
      method: "POST",
      body: uploadForm,
    });

    if (!response.ok) {
      throw new Error(`Litterbox upload failed with status ${response.status}`);
    }

    const fileUrl = (await response.text()).trim();
    if (!fileUrl.startsWith("https://")) {
      throw new Error(`Litterbox returned invalid response: ${fileUrl}`);
    }

    console.log("Successfully uploaded to Litterbox:", fileUrl);
    return NextResponse.json({ url: fileUrl });
  } catch (err: any) {
    console.error("Upload API Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
