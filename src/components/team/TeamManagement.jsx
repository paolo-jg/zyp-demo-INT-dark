import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Mail, Shield, ShieldCheck, Eye, DollarSign,
  MoreVertical, X, Check, Clock, Trash2, Edit2, AlertCircle, Copy, RefreshCw
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { validateEmail, checkRateLimit } from '../../utils/validators';
import { secureLog, secureError } from '../../utils/secureLogging';

// Role definitions with permissions
const ROLES = {
  owner: {
    label: 'Owner',
    description: 'Full access to all features',
    icon: ShieldCheck,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-1000/20',
    permissions: ['view', 'send', 'manage_recipients', 'manage_invoices', 'manage_team', 'settings', 'delete']
  },
  admin: {
    label: 'Admin',
    description: 'Manage team and settings',
    icon: Shield,
    color: 'text-blue-700',
    bgColor: 'bg-blue-1000/20',
    permissions: ['view', 'send', 'manage_recipients', 'manage_invoices', 'manage_team', 'settings']
  },
  finance: {
    label: 'Finance',
    description: 'Send payments and manage invoices',
    icon: DollarSign,
    color: 'text-purple-700',
    bgColor: 'bg-purple-1000/20',
    permissions: ['view', 'send', 'manage_recipients', 'manage_invoices']
  },
  viewer: {
    label: 'Viewer',
    description: 'View-only access',
    icon: Eye,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-500/20',
    permissions: ['view']
  }
};

const PERMISSION_LABELS = {
  view: 'View Dashboard & Reports',
  send: 'Send Payments',
  manage_recipients: 'Manage Recipients',
  manage_invoices: 'Create & Edit Invoices',
  manage_team: 'Invite & Manage Team',
  settings: 'Access Settings',
  delete: 'Delete Data'
};

function TeamManagement({ user, userData, embedded = false }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const currentUserRole = userData?.team_role || 'owner';
  const canManageTeam = ['owner', 'admin'].includes(currentUserRole);

  const fetchTeamData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    
    try {
      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`id, role, joined_at, member:users!team_members_member_id_fkey (id, email, first_name, last_name)`)
        .eq('owner_id', userData?.team_owner_id || user.id);

      if (membersError && membersError.code !== 'PGRST116') {
        secureError('Error fetching team members:', membersError);
      }

      // Fetch pending invites
      const { data: invites, error: invitesError } = await supabase
        .from('team_invites')
        .select('*')
        .eq('owner_id', userData?.team_owner_id || user.id)
        .eq('status', 'pending');

      if (invitesError && invitesError.code !== 'PGRST116') {
        secureError('Error fetching invites:', invitesError);
      }

      // Add owner to list
      const ownerMember = {
        id: 'owner',
        role: 'owner',
        joined_at: userData?.created_at || new Date().toISOString(),
        member: { id: user.id, email: user.email, first_name: userData?.first_name, last_name: userData?.last_name }
      };

      const allMembers = members ? [ownerMember, ...members.filter(m => m.member?.id !== user.id)] : [ownerMember];
      setTeamMembers(allMembers);
      setPendingInvites(invites || []);
    } catch (err) {
      secureError('Failed to fetch team data:', err);
    }
    setIsLoading(false);
  }, [user?.id, userData]);

  useEffect(() => { fetchTeamData(); }, [fetchTeamData]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    const emailValidation = validateEmail(inviteEmail);
    if (!emailValidation.isValid) {
      setInviteError(emailValidation.errors[0]);
      return;
    }

    if (teamMembers.some(m => m.member?.email === inviteEmail)) {
      setInviteError('This person is already a team member.');
      return;
    }

    if (pendingInvites.some(i => i.email === inviteEmail)) {
      setInviteError('An invite has already been sent to this email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: insertError } = await supabase
        .from('team_invites')
        .insert({
          owner_id: userData?.team_owner_id || user.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          token,
          expires_at: expiresAt.toISOString(),
          invited_by: user.id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      // Send invite email via edge function
      await supabase.functions.invoke('send-team-invite', {
        body: {
          to_email: inviteEmail,
          inviter_name: `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || user.email,
          team_name: userData?.business_name || 'Zyp Team',
          role: ROLES[inviteRole].label,
          invite_token: token
        }
      });

      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('viewer');
      fetchTeamData();
      setTimeout(() => { setShowInviteModal(false); setInviteSuccess(''); }, 2000);
    } catch (err) {
      secureError('Failed to send invite:', err);
      setInviteError('Failed to send invite. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleResendInvite = async (invite) => {
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      await supabase.from('team_invites').update({ expires_at: newExpiry.toISOString() }).eq('id', invite.id);
      await supabase.functions.invoke('send-team-invite', {
        body: { to_email: invite.email, inviter_name: userData?.first_name || user.email, team_name: userData?.business_name || 'Zyp Team', role: ROLES[invite.role].label, invite_token: invite.token }
      });
      fetchTeamData();
    } catch (err) { secureError('Failed to resend invite:', err); }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await supabase.from('team_invites').delete().eq('id', inviteId);
      fetchTeamData();
    } catch (err) { secureError('Failed to cancel invite:', err); }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    if (memberId === 'owner') return;
    try {
      await supabase.from('team_members').update({ role: newRole }).eq('id', memberId);
      fetchTeamData();
      setShowEditModal(false);
      setSelectedMember(null);
    } catch (err) { secureError('Failed to update role:', err); }
  };

  const handleRemoveMember = async (memberId) => {
    if (memberId === 'owner' || !confirm('Remove this team member?')) return;
    try {
      await supabase.from('team_members').delete().eq('id', memberId);
      fetchTeamData();
      setActiveDropdown(null);
    } catch (err) { secureError('Failed to remove member:', err); }
  };

  const copyInviteLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?token=${token}`);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 md:p-6 space-y-6'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Team</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage team members and permissions</p>
        </div>
        {canManageTeam && (
          <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors">
            <UserPlus className="w-5 h-5" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            Team Members ({teamMembers.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading team...
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {teamMembers.map((member) => {
              const role = ROLES[member.role] || ROLES.viewer;
              const RoleIcon = role.icon;
              const isCurrentUser = member.member?.id === user?.id;

              return (
                <div key={member.id} className="px-4 md:px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                        {member.member?.first_name?.[0] || member.member?.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {member.member?.first_name && member.member?.last_name
                            ? `${member.member.first_name} ${member.member.last_name}`
                            : member.member?.email}
                        </p>
                        {isCurrentUser && <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">You</span>}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.member?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full ${role.bgColor}`}>
                      <RoleIcon className={`w-3.5 h-3.5 ${role.color}`} />
                      <span className={`text-xs md:text-sm font-medium ${role.color}`}>{role.label}</span>
                    </div>
                    {canManageTeam && !isCurrentUser && member.role !== 'owner' && (
                      <div className="relative">
                        <button onClick={() => setActiveDropdown(activeDropdown === member.id ? null : member.id)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        {activeDropdown === member.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                            <button onClick={() => { setSelectedMember(member); setShowEditModal(true); setActiveDropdown(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                              <Edit2 className="w-4 h-4" /> Change Role
                            </button>
                            <button onClick={() => handleRemoveMember(member.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-red-700 flex items-center gap-2">
                              <Trash2 className="w-4 h-4" /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-700" />
              Pending Invites ({pendingInvites.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pendingInvites.map((invite) => {
              const role = ROLES[invite.role] || ROLES.viewer;
              const isExpired = new Date(invite.expires_at) < new Date();
              return (
                <div key={invite.id} className="px-4 md:px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{invite.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{isExpired ? <span className="text-red-700">Expired</span> : <>Expires {formatDate(invite.expires_at)}</>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                    <span className={`text-xs md:text-sm px-2 md:px-3 py-1 rounded-full ${role.bgColor} ${role.color}`}>{role.label}</span>
                    {canManageTeam && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyInviteLink(invite.token)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg" title="Copy link"><Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                        <button onClick={() => handleResendInvite(invite)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg" title="Resend"><RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                        <button onClick={() => handleCancelInvite(invite.id)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg" title="Cancel"><X className="w-4 h-4 text-red-700" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permissions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold">Role Permissions</h2>
        </div>
        <div className="p-4 md:p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="pb-3 pr-4">Permission</th>
                {Object.entries(ROLES).map(([key, role]) => (
                  <th key={key} className="pb-3 px-2 text-center"><span className={role.color}>{role.label}</span></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                <tr key={perm}>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{label}</td>
                  {Object.entries(ROLES).map(([roleKey, role]) => (
                    <td key={roleKey} className="py-2 px-2 text-center">
                      {role.permissions.includes(perm) ? <Check className="w-4 h-4 text-emerald-700 mx-auto" /> : <X className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              {inviteError && <div className="flex items-center gap-2 p-3 bg-red-200 border border-red-500/20 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{inviteError}</div>}
              {inviteSuccess && <div className="flex items-center gap-2 p-3 bg-emerald-200 border border-emerald-500/20 rounded-lg text-emerald-700 text-sm"><Check className="w-4 h-4" />{inviteSuccess}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Email Address</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Role</label>
                <div className="space-y-2">
                  {Object.entries(ROLES).filter(([key]) => key !== 'owner').map(([key, role]) => {
                    const RoleIcon = role.icon;
                    return (
                      <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${inviteRole === key ? 'border-emerald-500 bg-emerald-200 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-600'}`}>
                        <input type="radio" name="role" value={key} checked={inviteRole === key} onChange={(e) => setInviteRole(e.target.value)} className="sr-only" />
                        <div className={`w-8 h-8 rounded-lg ${role.bgColor} flex items-center justify-center`}><RoleIcon className={`w-4 h-4 ${role.color}`} /></div>
                        <div className="flex-1"><p className="font-medium">{role.label}</p><p className="text-xs text-gray-500 dark:text-gray-400">{role.description}</p></div>
                        {inviteRole === key && <Check className="w-5 h-5 text-emerald-700" />}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={isSubmitting || !inviteEmail} className="flex-1 px-4 py-3 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />Sending...</> : <><Mail className="w-4 h-4" />Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Change Role</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedMember(null); }} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-500 dark:text-gray-400">Change role for <span className="text-gray-900 dark:text-white font-medium">{selectedMember.member?.email}</span></p>
              <div className="space-y-2">
                {Object.entries(ROLES).filter(([key]) => key !== 'owner').map(([key, role]) => {
                  const RoleIcon = role.icon;
                  return (
                    <button key={key} onClick={() => handleUpdateRole(selectedMember.id, key)} className={`w-full flex items-center gap-3 p-3 rounded-md border transition-colors ${selectedMember.role === key ? 'border-emerald-500 bg-emerald-200 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-600'}`}>
                      <div className={`w-8 h-8 rounded-lg ${role.bgColor} flex items-center justify-center`}><RoleIcon className={`w-4 h-4 ${role.color}`} /></div>
                      <div className="flex-1 text-left"><p className="font-medium">{role.label}</p><p className="text-xs text-gray-500 dark:text-gray-400">{role.description}</p></div>
                      {selectedMember.role === key && <Check className="w-5 h-5 text-emerald-700" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamManagement;
