import { Guild, GuildMember, Role } from 'discord.js';

export async function getRole(
    guild: Guild,
    roleId: string
): Promise<Role> {
    const role = await guild.roles.fetch(roleId);
    if (!role?.name?.length) {
        return null;
    }
    return role;
}

export async function getRoleMembers(
    guild: Guild,
    role: Role
): Promise<GuildMember[]> {
    await guild.members.fetch();
    return role.members.toJSON();
}