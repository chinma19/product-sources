// Shared image validation for creation and non-destructive replacement.
export async function imageData(file){
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8000000||file.size===0)throw Error('Use a JPG, PNG or WebP image under 8 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
 if(!valid)throw Error('This file does not match its image format.');return {bytes,mime:file.type,size:file.size};
}
export const evidenceOrder='display_order ASC, created_at ASC, id ASC';
