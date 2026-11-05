import type { AccountMediaStatus } from '../accountMedia';
import type { AccountRoomLayoutColumns, AccountRoomRow, RoomVisibility } from '../accountRoom';
import type { Database as HostedDatabase } from './database.generated';

/**
 * public.rooms is not in database.generated.ts yet: it is typed by hand from
 * 20261105090000_account_rooms.sql until the migration is applied and types regenerated.
 * Insert takes no columns: rows come only from the profile trigger.
 */
type RoomUpdate = Partial<AccountRoomLayoutColumns> & { slug?: string | null; visibility?: RoomVisibility };

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
      rooms:{Row:AccountRoomRow;Insert:Record<string,never>;Update:RoomUpdate;Relationships:[{foreignKeyName:'rooms_owner_id_fkey';columns:['owner_id'];isOneToOne:true;referencedRelation:'profiles';referencedColumns:['id']}]};
    };
    Views:Record<string,never>;Functions:Record<string,never>;Enums:Record<string,never>;CompositeTypes:Record<string,never>;
  };
};
