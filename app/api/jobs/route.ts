import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        const file = formData.get("file");
        if (!file) {
            return new Response(JSON.stringify({ error: "Missing file parameter" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (!(file instanceof File)) {
            return new Response(JSON.stringify({ error: "File parameter is not a valid file" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        

        const hasHeaderStr = formData.get("has_header");
        const hasHeader = hasHeaderStr ? hasHeaderStr === "true" : false;
        
        return new Response(JSON.stringify({ 
            success: true,
            message: "File received successfully",
            file_size: buffer.length,
            has_header: hasHeader
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error processing request:", error);
        return new Response(JSON.stringify({ error: "Failed to process request" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}