import { NextResponse } from "next/server";

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

    // Prepare upload payload for Catbox.moe
    const uploadForm = new FormData();
    uploadForm.append("reqtype", "fileupload");
    uploadForm.append("fileToUpload", new Blob([buffer], { type: file.type }), file.name);

    console.log("Uploading file to Catbox.moe from server side...", file.name, file.size);
    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: uploadForm,
    });

    if (!response.ok) {
      throw new Error(`Catbox upload failed with status ${response.status}`);
    }

    const fileUrl = await response.text();
    if (!fileUrl.startsWith("http")) {
      throw new Error(`Catbox returned an invalid URL: ${fileUrl}`);
    }

    console.log("Successfully uploaded to Catbox.moe:", fileUrl);
    return NextResponse.json({ url: fileUrl });
  } catch (err: any) {
    console.error("Upload API Error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
