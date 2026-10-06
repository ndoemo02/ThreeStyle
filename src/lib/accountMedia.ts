/** Shared contract for durable media; local/session demo media stays separate. */
export const ACCOUNT_MEDIA_BUCKET = 'creator-media';
export const DEFAULT_ACCOUNT_FILE_BYTES = 50 * 1024 * 1024;
export const FOUNDATION_MAX_FILE_BYTES = 200 * 1024 * 1024;
export type AccountMediaStatus = 'uploading' | 'ready' | 'failed' | 'deleting';

const formats: Record<string, {kind:'audio'|'video';mime:string}> = {
  mp3:{kind:'audio',mime:'audio/mpeg'},wav:{kind:'audio',mime:'audio/wav'},
  m4a:{kind:'audio',mime:'audio/mp4'},aac:{kind:'audio',mime:'audio/aac'},
  flac:{kind:'audio',mime:'audio/flac'},ogg:{kind:'audio',mime:'audio/ogg'},opus:{kind:'audio',mime:'audio/ogg'},
  mp4:{kind:'video',mime:'video/mp4'},webm:{kind:'video',mime:'video/webm'},
  mov:{kind:'video',mime:'video/quicktime'},m4v:{kind:'video',mime:'video/mp4'},ogv:{kind:'video',mime:'video/ogg'},
};

export function inspectAccountFile(file: {name:string;size:number}, limit=DEFAULT_ACCOUNT_FILE_BYTES) {
  if(!Number.isSafeInteger(limit) || limit<=0 || limit>FOUNDATION_MAX_FILE_BYTES) throw new Error('Nieprawidłowy limit uploadu.');
  if(!Number.isSafeInteger(file.size) || file.size<=0) throw new Error('Ten plik jest pusty lub ma nieprawidłowy rozmiar.');
  if(file.size>limit) throw new Error(`Wybierz plik do ${Math.floor(limit/1024/1024)} MB dla biblioteki konta.`);
  const extension=file.name.split('.').pop()?.toLowerCase() ?? '';
  const format=formats[extension];
  if(!file.name.includes('.') || !format) throw new Error('Wybierz obsługiwany plik audio lub wideo.');
  const filename=file.name.trim();
  if(!filename || [...filename].length>255) throw new Error('Nazwa pliku może mieć do 255 znaków.');
  const title=filename.slice(0,-extension.length-1).trim() || 'Bez tytułu';
  return {kind:format.kind,mime_type:format.mime,file_extension:extension,original_filename:filename,title:[...title].slice(0,160).join(''),size_bytes:file.size};
}

export function accountObjectPath(userId:string,mediaId:string,extension:string) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(userId)||!uuid.test(mediaId)||!formats[extension]) throw new Error('Nieprawidłowy identyfikator pliku.');
  return `${userId.toLowerCase()}/${mediaId.toLowerCase()}/original.${extension}`;
}
