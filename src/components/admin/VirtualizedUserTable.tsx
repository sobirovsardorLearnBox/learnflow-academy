import { memo, CSSProperties } from 'react';
import { MoreVertical, Shield, Trash2, Users, Clock } from 'lucide-react';
import { List } from 'react-window';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentStatusBadge } from '@/components/dashboard/PaymentBanner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ROW_HEIGHT = 72; // Height of each table row

export interface UserData {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  daily_lesson_limit?: number;
  paymentStatus: 'pending' | 'approved' | 'blocked';
}

interface RowData {
  users: UserData[];
  userGroups?: Record<string, string[]>;
  onOpenRoleDialog: (user: UserData) => void;
  onOpenLimitDialog: (user: UserData) => void;
  onOpenDeleteDialog: (user: UserData) => void;
}

type UserRowProps = {
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
  index: number;
  style: CSSProperties;
} & RowData;

function UserRowComponent({
  index,
  style,
  users,
  userGroups,
  onOpenRoleDialog,
  onOpenLimitDialog,
  onOpenDeleteDialog,
}: UserRowProps) {
  const user = users[index];

  return (
    <div 
      style={style} 
      className="flex items-center border-b border-border hover:bg-secondary/30 transition-colors"
    >
      {/* User Info */}
      <div className="flex-1 p-4 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Role */}
      <div className="w-[100px] p-4">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          user.role === 'admin' && 'bg-violet-500/20 text-violet-400',
          user.role === 'teacher' && 'bg-emerald-500/20 text-emerald-400',
          user.role === 'student' && 'bg-cyan-500/20 text-cyan-400'
        )}>
          {user.role === 'admin' && 'Admin'}
          {user.role === 'teacher' && "O'qituvchi"}
          {user.role === 'student' && 'Talaba'}
        </span>
      </div>

      {/* Group */}
      <div className="w-[150px] p-4">
        {user.role === 'student' && userGroups?.[user.user_id] ? (
          <div className="flex flex-wrap gap-1">
            {userGroups[user.user_id].slice(0, 2).map((groupName, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {groupName}
              </Badge>
            ))}
            {userGroups[user.user_id].length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{userGroups[user.user_id].length - 2}
              </Badge>
            )}
          </div>
        ) : user.role === 'student' ? (
          <span className="text-muted-foreground text-sm">Guruhsiz</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>

      {/* Daily Limit */}
      <div className="w-[120px] p-4">
        {user.role === 'student' ? (
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-primary/10"
            onClick={() => onOpenLimitDialog(user)}
          >
            <Clock className="w-3 h-3 mr-1" />
            {user.daily_lesson_limit ?? 1} dars/kun
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>

      {/* Payment Status */}
      <div className="w-[100px] p-4">
        <PaymentStatusBadge status={user.paymentStatus} />
      </div>

      {/* Actions */}
      <div className="w-[80px] p-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenRoleDialog(user)}>
              <Shield className="w-4 h-4 mr-2" />
              Rolni o'zgartirish
            </DropdownMenuItem>
            {user.role === 'student' && (
              <DropdownMenuItem onClick={() => onOpenLimitDialog(user)}>
                <Clock className="w-4 h-4 mr-2" />
                Kunlik limitni o'zgartirish
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onOpenDeleteDialog(user)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              O'chirish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface VirtualizedUserTableProps {
  users: UserData[];
  userGroups?: Record<string, string[]>;
  onOpenRoleDialog: (user: UserData) => void;
  onOpenLimitDialog: (user: UserData) => void;
  onOpenDeleteDialog: (user: UserData) => void;
  maxHeight?: number;
}

export const VirtualizedUserTable = memo(function VirtualizedUserTable({
  users,
  userGroups,
  onOpenRoleDialog,
  onOpenLimitDialog,
  onOpenDeleteDialog,
  maxHeight = 600,
}: VirtualizedUserTableProps) {
  const listHeight = Math.min(Math.max(users.length * ROW_HEIGHT, 200), maxHeight);

  const rowData: RowData = {
    users,
    userGroups,
    onOpenRoleDialog,
    onOpenLimitDialog,
    onOpenDeleteDialog,
  };

  return (
    <div>
      {/* Table Header */}
      <div className="flex items-center border-b border-border bg-muted/50">
        <div className="flex-1 p-4 min-w-[200px] text-sm font-medium text-muted-foreground">
          Foydalanuvchi
        </div>
        <div className="w-[100px] p-4 text-sm font-medium text-muted-foreground">
          Rol
        </div>
        <div className="w-[150px] p-4 text-sm font-medium text-muted-foreground">
          Guruh
        </div>
        <div className="w-[120px] p-4 text-sm font-medium text-muted-foreground">
          Kunlik limit
        </div>
        <div className="w-[100px] p-4 text-sm font-medium text-muted-foreground">
          To'lov
        </div>
        <div className="w-[80px] p-4 text-sm font-medium text-muted-foreground text-right">
          Amallar
        </div>
      </div>

      {/* Virtualized Rows */}
      <div style={{ height: listHeight }}>
        <List
          rowCount={users.length}
          rowHeight={ROW_HEIGHT}
          rowProps={rowData}
          rowComponent={UserRowComponent}
          overscanCount={10}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
});
