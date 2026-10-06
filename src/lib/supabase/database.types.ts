import type { AccountMediaStatus } from '../accountMedia';
import type { Database as HostedDatabase } from './database.generated';

/** Hosted schema with narrower account-write permissions and CHECK-constrained values. */
type ProfileRow = HostedDatabase['public']['Tables']['profiles']['Row'];
export type AccountMediaRow = Omit<HostedDatabase['public']['Tables']['media_assets']['Row'],'kind'|'status'|'object_path'> & {
  kind:'audio'|'video';status:AccountMediaStatus;object_path:string;
};
type MediaInsert = Pick<AccountMediaRow,'kind'|'title'|'original_filename'|'file_extension'|'mime_type'|'size_bytes'> & {
  id?:string;user_id?:string;duration_seconds?:number|null;status?:'uploading';object_path?:never;
};
export type Database = {
  __InternalSupabase:HostedDatabase['__InternalSupabase'];
  public:{
    Tables:{
      profiles:{Row:ProfileRow;Insert:{id:string;display_name?:string|null;handle?:string|null};Update:{display_name?:string|null;handle?:string|null};Relationships:[]};
      media_assets:{Row:AccountMediaRow;Insert:MediaInsert;Update:{title?:string;duration_seconds?:number|null;status?:AccountMediaStatus};Relationships:[{foreignKeyName:'media_assets_user_id_fkey';columns:['user_id'];isOneToOne:false;referencedRelation:'profiles';referencedColumns:['id']}]};
    };
    Views:Record<string,never>;Functions:Record<string,never>;Enums:Record<string,never>;CompositeTypes:Record<string,never>;
  };
};
