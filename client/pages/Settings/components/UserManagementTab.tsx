import { useState } from 'react';
import { Shield, UserCheck, Eye, UserCog } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type UserRole = 'Admin' | 'Approver' | 'Viewer';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Inactive';
}

const INITIAL_USERS: DemoUser[] = [
  {
    id: 'u-001',
    name: 'Cindy Lin',
    email: 'cindy.lin@company.com',
    role: 'Admin',
    department: 'Finance',
    status: 'Active',
  },
  {
    id: 'u-002',
    name: 'David Wong',
    email: 'david.wong@company.com',
    role: 'Approver',
    department: 'Finance',
    status: 'Active',
  },
  {
    id: 'u-003',
    name: 'Sarah Chan',
    email: 'sarah.chan@company.com',
    role: 'Viewer',
    department: 'Operations',
    status: 'Active',
  },
  {
    id: 'u-004',
    name: 'Michael Liu',
    email: 'michael.liu@company.com',
    role: 'Approver',
    department: 'IT',
    status: 'Inactive',
  },
];

const ROLE_PERMISSIONS: {
  role: UserRole;
  icon: typeof Shield;
  description: string;
  permissions: string[];
}[] = [
  {
    role: 'Admin',
    icon: Shield,
    description: 'Full system access with user and configuration management',
    permissions: [
      'Manage users and roles',
      'Configure system settings',
      'Approve and process payments',
      'Create/edit all records',
      'View audit logs',
      'Export all data',
    ],
  },
  {
    role: 'Approver',
    icon: UserCheck,
    description: 'Review and approve financial transactions',
    permissions: [
      'Approve/reject payments',
      'Review documents',
      'Create payment advices',
      'Reconcile transactions',
      'View reports',
      'Export own data',
    ],
  },
  {
    role: 'Viewer',
    icon: Eye,
    description: 'Read-only access to financial records',
    permissions: [
      'View documents and payments',
      'View project details',
      'View reports and dashboards',
      'Export viewable data',
    ],
  },
];

const UserManagementTab = () => {
  const [users, setUsers] = useState<DemoUser[]>(INITIAL_USERS);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    logger.info(`Role updated for user ${userId}: ${newRole}`);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'default';
      case 'Approver':
        return 'secondary';
      case 'Viewer':
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="size-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-sm bg-accent/10 flex items-center justify-center text-accent font-medium text-xs">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.status === 'Active' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-200">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={user.role}
                      onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                      disabled={user.status !== 'Active'}
                    >
                      <SelectTrigger className="w-32 h-8 inline-flex">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Approver">Approver</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Note: User management is UI-only for demo purposes. Backend integration coming soon.
          </p>
        </CardContent>
      </Card>

      {/* Role permissions reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_PERMISSIONS.map((roleDef) => {
              const Icon = roleDef.icon;
              return (
                <div
                  key={roleDef.role}
                  className="p-4 rounded-sm border bg-slate-50/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-sm bg-primary/10 flex items-center justify-center">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{roleDef.role}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {roleDef.description}
                  </p>
                  <ul className="space-y-1.5">
                    {roleDef.permissions.map((perm) => (
                      <li key={perm} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-accent mt-0.5">•</span>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementTab;
