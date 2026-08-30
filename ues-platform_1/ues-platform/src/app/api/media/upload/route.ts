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

        // Make the file publicly readable so Facebook/Instagram CDNs can fetch it
        await fileRef.makePublic();
        
        // Google Cloud Storage public URL format
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.log("Successfully uploaded to Firebase Storage (Admin):", publicUrl);
        return NextResponse.json({ url: publicUrl });
      } catch (storageErr: any) {
        console.warn("Firebase Admin Storage upload failed, falling back to tmpfiles.org:", storageErr?.message || storageErr);
      }
    }

    // 2. Fallback to tmpfiles.org (reliable, no CORS/Precondition block)
    const uploadForm = new FormData();
    uploadForm.append("file", new Blob([buffer], { type: file.type }), file.name);

    console.log("Uploading file to tmpfiles.org from server side...", file.name, file.size);
    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: uploadForm,
    });

    if (!response.ok) {
      throw new Error(`tmpfiles.org upload failed with status ${response.status}`);
    }

    const resData = await response.json();
    if (!resData.data?.url) {
      throw new Error(`tmpfiles.org returned invalid response structure: ${JSON.stringify(resData)}`);
    }

    // Convert to direct download link required by Meta Graph API
    const fileUrl = resData.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
    console.log("Successfully uploaded to tmpfiles.org:", fileUrl);
    return NextResponse.json({ url: fileUrl });
  } catch (err: any) {
    console.error("Upload API Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
