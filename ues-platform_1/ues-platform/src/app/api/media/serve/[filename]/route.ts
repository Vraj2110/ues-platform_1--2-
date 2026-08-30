import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  try {
    const { filename } = params;
    const tempDir = path.join(os.tmpdir(), "ues-media");
    const filePath = path.join(tempDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[Media Serve] File not found: ${filePath}`);
      return new Response("File not found", { status: 404 });
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    // Detect Content-Type based on extension
    let contentType = "application/octet-stream";
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith(".mp4")) contentType = "video/mp4";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (lowerName.endsWith(".png")) contentType = "image/png";
    else if (lowerName.endsWith(".gif")) contentType = "image/gif";
    else if (lowerName.endsWith(".webp")) contentType = "image/webp";

    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` }
        });
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      return new Response(fileStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // Standard Full File GET Request
    const fileStream = fs.createReadStream(filePath);
    return new Response(fileStream as any, {
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
      }
    });
  } catch (error: any) {
    console.error("[Media Serve] Error serving media file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
