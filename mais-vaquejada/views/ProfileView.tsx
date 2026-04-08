import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface ProfileViewProps {
    user: User | null;
    targetUsername?: string | null;
    onLogout: () => void;
    onAdminView: () => void;
    onSettingsView: () => void;
    onProfileUpdate?: () => void;
}

// -----------------------------------------------------------------------------
// DADOS MOCKADOS
// -----------------------------------------------------------------------------
const MY_POSTS_MOCK = [
    { id: '1', img: 'https://picsum.photos/seed/feed1/500', likes: 120, comments: 12 },
    { id: '2', img: 'https://picsum.photos/seed/feed2/500', likes: 85, comments: 4 },
    { id: '3', img: 'https://picsum.photos/seed/feed3/500', likes: 230, comments: 45 },
    { id: '4', img: 'https://picsum.photos/seed/feed4/500', likes: 45, comments: 2 },
    { id: '5', img: 'https://picsum.photos/seed/feed5/500', likes: 67, comments: 8 },
    { id: '6', img: 'https://picsum.photos/seed/feed6/500', likes: 112, comments: 15 },
];

const ADS_MOCK = [
    { title: 'SELA PROFISSIONAL LUXO', price: 'R$ 1.500', loc: 'CG, PB', img: 'https://picsum.photos/seed/sela/400' },
    { title: 'CAMINHÃO REBOQUE 2024', price: 'R$ 85.000', loc: 'JP, PB', img: 'https://picsum.photos/seed/truck/400' },
];

type TabType = 'POSTS' | 'ADS' | 'FAVORITES' | 'HIGHLIGHTS' | 'EVENTS';

const ProfileView: React.FC<ProfileViewProps> = ({ user, targetUsername, onLogout, onAdminView, onSettingsView, onProfileUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('POSTS');
    const [profileData, setProfileData] = useState<any>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [editingPost, setEditingPost] = useState<string | null>(null);
    const [editCaption, setEditCaption] = useState('');
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [listModalType, setListModalType] = useState<'FOLLOWERS' | 'FOLLOWING' | null>(null);
    const [listModalData, setListModalData] = useState<any[]>([]);
    const [listModalLoading, setListModalLoading] = useState(false);

    // Determines if the user is looking at their own profile
    const isMyProfile = !targetUsername || targetUsername === 'meu-perfil' || (user && user.username && targetUsername === user.username);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update local state and global state
            setProfileData((prev: any) => prev ? { ...prev, avatar_url: publicUrl } : null);
            if (onProfileUpdate) onProfileUpdate();
            
            alert('Foto enviada com sucesso!');
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert(`Erro ao enviar foto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Persist profile stats locally for 'realness' in demo
    const [stats, setStats] = useState({
        followers: 0,
        following: 0,
        posts: 0
    });

    useEffect(() => {
        localStorage.setItem(`arena_stats_${targetUsername || 'me'}`, JSON.stringify(stats));
    }, [stats, targetUsername]);

    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const [profilePosts, setProfilePosts] = useState<any[]>([]);

    // Persist profilePosts
    useEffect(() => {
        if (isMyProfile) {
            localStorage.setItem('arena_user_posts', JSON.stringify(profilePosts));
        }
    }, [profilePosts, isMyProfile]);

    // Persist Follow State from DB
    useEffect(() => {
        const checkFollow = async () => {
            if (!isMyProfile && user && profileData) {
                const { data } = await supabase
                    .from('follows')
                    .select('*')
                    .eq('follower_id', user.id)
                    .eq('following_id', profileData.id)
                    .single();
                
                setIsFollowing(!!data);
            }
        };
        checkFollow();
    }, [isMyProfile, user, profileData]);

    const handleToggleFollow = async () => {
        if (!user || isMyProfile || !profileData) return;

        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', profileData.id);
                
                if (error) throw error;
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            } else {
                // Follow
                const { error } = await supabase
                    .from('follows')
                    .insert({
                        follower_id: user.id,
                        following_id: profileData.id
                    });
                
                if (error) throw error;
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                
                // Optional: Create notification
                await supabase.from('notifications').insert({
                    user_id: profileData.id,
                    actor_id: user.id,
                    type: 'follow'
                });
            }
        } catch (err) {
            console.error("Error toggling follow:", err);
        }
    };

    const shareProfile = () => {
        if (navigator.share) {
            navigator.share({
                title: `Perfil de ${profileData?.name} no +Vaquejada`,
                text: `Confira o perfil de @${profileData?.username} na Arena +Vaquejada! 🐎`,
                url: window.location.href,
            }).catch(err => console.error('Erro ao compartilhar', err));
        } else {
            alert(`Link do perfil copiado: ${window.location.href}`);
        }
    };

    const handleShare = (post: any) => {
        if (navigator.share) {
            navigator.share({
                title: `Post de ${profileData?.username} no +Vaquejada`,
                text: post.caption || 'Foto na arena! 🐎',
                url: window.location.href,
            }).catch(err => console.error('Erro ao compartilhar', err));
        } else {
            alert(`Link do post copiado: ${window.location.href}`);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                let currentProfile: any = null;
                let profileId = '';

                if (isMyProfile && user) {
                    profileId = user.id;
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    
                    if (data) currentProfile = data;
                } else if (targetUsername) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('username', targetUsername)
                        .single();
                    if (data) {
                        currentProfile = data;
                        profileId = data.id;
                    }
                }

                if (profileId) {
                    // Fetch real counts
                    const [postsRes, followersRes, followingRes] = await Promise.all([
                        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profileId),
                        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
                        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId)
                    ]);

                    setStats({
                        posts: postsRes.count || 0,
                        followers: followersRes.count || 0,
                        following: followingRes.count || 0
                    });

                    // Fetch actual posts
                    const { data: postsData } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('user_id', profileId)
                        .order('created_at', { ascending: false });
                    
                    if (postsData) {
                        setProfilePosts(postsData.map(p => ({
                            id: p.id,
                            img: p.media_url,
                            likes: 0, // In a full implementation, we'd fetch likes/comments count per post
                            comments: 0,
                            caption: p.caption
                        })));
                    }

                    if (currentProfile) {
                        setProfileData({
                            ...currentProfile,
                            location: `${currentProfile.city_name || currentProfile.city_id || 'Arena'}, ${currentProfile.state_name || currentProfile.state_id || '+VAQUEJADA'}`,
                            isVerified: currentProfile.is_verified || currentProfile.role === 'ADMIN_MASTER'
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
                setProfileData(null);
            } finally {
                setLoading(false);
            }
        };

        // Safety timeout: Never stay loading more than 3 seconds
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 3000);

        if (user || targetUsername) {
            fetchProfile();
        } else {
            setLoading(false);
        }

        return () => clearTimeout(safetyTimer);
    }, [isMyProfile, targetUsername, user?.id]);

    const openListModal = async (type: 'FOLLOWERS' | 'FOLLOWING') => {
        if (!displayData?.id) return;
        setListModalType(type);
        setListModalLoading(true);
        setListModalData([]);

        try {
            const { data: followsData } = await supabase
                .from('follows')
                .select('*')
                .eq(type === 'FOLLOWERS' ? 'following_id' : 'follower_id', displayData.id);

            if (followsData && followsData.length > 0) {
                const ids = followsData.map(f => type === 'FOLLOWERS' ? f.follower_id : f.following_id);
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url')
                    .in('id', ids);
                
                if (profilesData) {
                    setListModalData(profilesData);
                }
            }
        } catch (err) {
            console.error("Error fetching list:", err);
        } finally {
            setListModalLoading(false);
        }
    };

    const displayData = profileData || (isMyProfile ? user : null);

    if (loading && !displayData) {
        return (
            <div className="min-h-full bg-background-dark px-6 py-24 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#ECA413] border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Carregando Arena...</p>
            </div>
        );
    }

    if (!displayData && !loading) {
        return (
            <div className="min-h-full bg-background-dark px-6 py-24 flex flex-col items-center justify-center text-center">
                <span className="material-icons text-6xl text-white/10 mb-6">person_off</span>
                <p className="text-white font-bold mb-2">Perfil não encontrado</p>
                <p className="text-white/40 text-xs mb-8">Este vaqueiro ainda não completou o cadastro ou o perfil não existe.</p>
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'SOCIAL' } }))}
                    className="bg-white/10 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                    Voltar para Arena
                </button>
            </div>
        );
    }

    const finalProfile = {
        id: displayData.id,
        name: displayData.name || displayData.full_name || 'Vaqueiro',
        username: displayData.username || (displayData.name || displayData.full_name || 'vaqueiro').toLowerCase().replace(/\s+/g, ''),
        avatar_url: displayData.avatar_url || displayData.avatar,
        bio: displayData.bio || 'Sem biografia ainda.',
        location: displayData.location || 'Brasil',
        isVerified: displayData.isVerified || displayData.role === 'ADMIN'
    };

    return (
        <div className="min-h-full bg-background-dark text-white font-sans pb-24 font-display">
            {/* Header / Actions */}
            <div className="px-6 pt-10 pb-4 flex justify-between items-center sticky top-0 bg-background-dark/90 backdrop-blur-md z-10 border-b border-white/5">
                <button
                   onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'SOCIAL' } }))}
                   className="material-icons opacity-100 text-white transition-all hover:scale-110 active:scale-90"
                >
                   arrow_back
                </button>
                <h1 className="text-white font-black text-lg tracking-wider uppercase border text-center opacity-0">PERFIL</h1> 
                <div className="flex gap-4">
                    {isMyProfile && (
                        <>
                            <button className="material-icons text-white/40 hover:text-white transition-colors">notifications_none</button>
                            <button onClick={onSettingsView} className="material-icons text-white/40 hover:text-white transition-colors">settings</button>
                        </>
                    )}
                    {!isMyProfile && (
                        <button className="material-icons text-white/40 hover:text-white transition-colors">more_vert</button>
                    )}
                </div>
            </div>

            <div className="px-6 pt-4">
                {/* Profile Header Info */}
                <div className="flex flex-row items-center gap-6 mb-6">
                    <div className="relative shrink-0 user-avatar-container">
                        <div className="w-24 h-24 rounded-full border-2 border-[#ECA413] p-1 bg-background-dark shadow-2xl relative group cursor-pointer active:scale-95 transition-transform overflow-hidden">
                            <img
                                src={finalProfile.avatar_url || `https://ui-avatars.com/api/?name=${finalProfile.name}&background=random`}
                                className="w-full h-full rounded-full object-cover transition-opacity group-hover:opacity-80 bg-neutral-800"
                                alt={finalProfile.name}
                            />
                        </div>
                        {isMyProfile && (
                            <div 
                                onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'MEDIA_CREATION' } }))}
                                className="absolute bottom-0 right-0 bg-[#ECA413] text-black w-8 h-8 rounded-full border-2 border-background-dark flex items-center justify-center cursor-pointer shadow-lg active:scale-90 transition-transform hover:scale-110"
                            >
                                <span className="material-icons text-[16px]">add</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex justify-between">
                       <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('POSTS')}>
                           <span className="text-lg font-black text-white">{stats.posts}</span>
                           <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Posts</span>
                       </div>
                       <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openListModal('FOLLOWERS')}>
                           <span className="text-lg font-black text-white">{stats.followers}</span>
                           <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Seguidores</span>
                       </div>
                       <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openListModal('FOLLOWING')}>
                           <span className="text-lg font-black text-white">{stats.following}</span>
                           <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Seguindo</span>
                       </div>
                    </div>
                </div>

                {/* Profile Bio */}
                <div className="mb-6">
                    <h2 className="text-lg font-black text-white flex items-center gap-1">
                        {finalProfile.name}
                        {finalProfile.isVerified && <span className="material-icons text-[#ECA413] text-[16px]">verified</span>}
                    </h2>
                    <p className="text-[12px] font-black text-[#ECA413] lowercase tracking-tight mb-2">@{finalProfile.username}</p>
                    <p className="text-sm font-medium text-white/80 leading-snug mb-2 whitespace-pre-wrap">
                        {finalProfile.bio}
                    </p>
                    <div className="flex items-center gap-1 text-white/40">
                        <span className="material-icons text-[14px]">place</span>
                        <span className="text-[11px] font-black uppercase tracking-wider">{finalProfile.location}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full mb-8">
                    {isMyProfile ? (
                        <>
                            <button 
                                onClick={() => setIsEditProfileOpen(true)}
                                className="flex-1 bg-white/10 text-white py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                            >
                                Editar Perfil
                            </button>
                            {user?.role === 'ADMIN' && (
                                <button 
                                    onClick={onAdminView}
                                    className="flex-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center hover:bg-[#D4AF37]/20 active:scale-95 transition-all"
                                >
                                    <span className="material-icons text-[16px] mr-1">shield</span>
                                    Painel Admin
                                </button>
                            )}
                            <button 
                                onClick={shareProfile} 
                                className="flex-1 bg-white/10 text-white py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                            >
                                Compartilhar
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={handleToggleFollow}
                                className={`flex-1 ${isFollowing ? 'bg-white/10 text-white' : 'bg-[#ECA413] text-black'} py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center active:scale-95 transition-all`}
                            >
                                {isFollowing ? 'Seguindo' : 'Seguir'}
                            </button>
                            <button 
                                onClick={() => window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'SOCIAL', openDM: finalProfile.username } }))}
                                className="flex-1 bg-white/10 text-white py-2.5 rounded-lg font-black text-[11px] uppercase tracking-wider flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                            >
                                Mensagem
                            </button>
                        </>
                    )}
                </div>

                {/* Sub-navigation Tabs */}
                <div className="flex justify-around border-b border-white/10 mb-2 mt-2">
                    <button 
                        onClick={() => setActiveTab('POSTS')}
                        className={`pb-3 flex-1 flex justify-center border-b-2 transition-all ${activeTab === 'POSTS' ? 'border-white text-white' : 'border-transparent text-white/40'}`}
                    >
                        <span className="material-icons text-[24px]">grid_on</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('ADS')}
                        className={`pb-3 flex-1 flex justify-center border-b-2 transition-all ${activeTab === 'ADS' ? 'border-white text-white' : 'border-transparent text-white/40'}`}
                    >
                        <span className="material-icons text-[24px]">storefront</span>
                    </button>
                    {isMyProfile && (
                        <button 
                            onClick={() => setActiveTab('FAVORITES')}
                            className={`pb-3 flex-1 flex justify-center border-b-2 transition-all ${activeTab === 'FAVORITES' ? 'border-white text-white' : 'border-transparent text-white/40'}`}
                        >
                            <span className="material-icons text-[24px]">bookmark_border</span>
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="mt-1">
                    {activeTab === 'POSTS' && (
                        <div className="grid grid-cols-3 gap-0.5 animate-in fade-in duration-300">
                            {(isMyProfile ? profilePosts : MY_POSTS_MOCK).map((post: any) => (
                                <div key={post.id} onClick={() => setSelectedPost(post)} className="aspect-square bg-white/5 relative group cursor-pointer overflow-hidden">
                                    <img src={post.img} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <span className="material-icons text-white text-sm">favorite</span>
                                            <span className="text-white font-black text-xs">{post.likes}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'ADS' && (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300 pt-2">
                            {ADS_MOCK.map((ad: any, i: number) => (
                                <div key={i} className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                                    <div className="aspect-square bg-black relative">
                                        <img src={ad.img} className="w-full h-full object-cover" alt=""/>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[#ECA413] font-black text-[11px] mb-1">{ad.price}</p>
                                        <p className="text-white font-bold text-[10px] truncate leading-tight">{ad.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'FAVORITES' && isMyProfile && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-40 animate-in fade-in duration-300">
                            <span className="material-icons text-4xl mb-4">bookmark_border</span>
                            <p className="text-xs font-black uppercase tracking-widest">Sem favoritos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Post Detail Overlay */}
            {selectedPost && (
                <div className="fixed inset-0 z-[200] bg-background-dark flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-background-dark/95 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedPost(null); setEditingPost(null); }} className="material-icons text-white">arrow_back</button>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#ECA413]">Publicação</h3>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-tight">{finalProfile.name}</p>
                            </div>
                        </div>
                        {isMyProfile && (
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => {
                                        if (editingPost === selectedPost.id) {
                                            const updatedPosts = profilePosts.map((p: any) => 
                                                p.id === selectedPost.id ? { ...p, caption: editCaption } : p
                                            );
                                            setProfilePosts(updatedPosts);
                                            setSelectedPost({...selectedPost, caption: editCaption});
                                            setEditingPost(null);
                                        } else {
                                            setEditingPost(selectedPost.id);
                                            setEditCaption(selectedPost.caption || '');
                                        }
                                    }}
                                    className="material-icons text-white/60 hover:text-white"
                                >
                                    {editingPost === selectedPost.id ? 'check' : 'edit'}
                                </button>
                                <button 
                                    onClick={() => {
                                        if (confirm('Tem certeza que deseja apagar essa publicação permanentemente?')) {
                                            setProfilePosts(profilePosts.filter((p: any) => p.id !== selectedPost.id));
                                            setSelectedPost(null);
                                        }
                                    }}
                                    className="material-icons text-red-500/80 hover:text-red-500"
                                >
                                    delete
                                </button>
                            </div>
                        )}
                    </header>
                    
                    <div className="flex-1 overflow-y-auto pb-8">
                        <div className="px-5 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-[#ECA413] p-[1.5px]">
                                <img className="w-full h-full object-cover rounded-full" src={profileData?.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}`} />
                            </div>
                            <div>
                                <span className="font-black text-xs text-white uppercase tracking-tight flex items-center gap-1">
                                    {finalProfile.username} 
                                    {finalProfile.isVerified && <span className="material-icons text-[#ECA413] text-[12px]">verified</span>}
                                </span>
                                <span className="text-[9px] font-bold uppercase text-white/40">{finalProfile.location}</span>
                            </div>
                        </div>

                        <div className="w-full aspect-square bg-black">
                            <img src={selectedPost.img} className="w-full h-full object-contain" />
                        </div>

                        <div className="px-5 py-4 flex justify-between items-center bg-background-dark">
                            <div className="flex gap-6 items-center">
                                <button 
                                    onClick={() => {
                                        setLikedPosts((prev: any) => {
                                            const next = new Set(prev);
                                            if (next.has(selectedPost.id)) next.delete(selectedPost.id);
                                            else next.add(selectedPost.id);
                                            return next;
                                        });
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <span className={`material-icons text-[26px] ${likedPosts.has(selectedPost.id) ? 'text-red-500' : 'text-white'}`}>
                                        {likedPosts.has(selectedPost.id) ? 'favorite' : 'favorite_border'}
                                    </span>
                                </button>
                                <button className="flex items-center gap-2">
                                    <span className="material-icons text-[24px] text-white">chat_bubble_outline</span>
                                </button>
                                <button onClick={shareProfile} className="flex items-center gap-2">
                                    <span className="material-icons text-[24px] text-white">share</span>
                                </button>
                            </div>
                            <button className="material-icons text-white/50">bookmark_border</button>
                        </div>
                        
                        <div className="px-5 space-y-2">
                            <p className="font-black text-sm text-white">{selectedPost.likes + (likedPosts.has(selectedPost.id) ? 1 : 0)} curtidas</p>
                            
                            {editingPost === selectedPost.id ? (
                                <div className="mt-2 text-white">
                                    <textarea 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#ECA413] outline-none transition-colors"
                                        rows={3}
                                        value={editCaption}
                                        onChange={(e) => setEditCaption(e.target.value)}
                                        placeholder="Nova legenda..."
                                    />
                                </div>
                            ) : (
                                <p className="text-[13px] leading-snug">
                                    <span className="font-black mr-2 text-white">{finalProfile.username}</span>
                                    <span className="text-white/80 font-medium">{selectedPost.caption || 'Foto na arena! 🐎🔥'}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Profile Overlay */}
            {isEditProfileOpen && (
                <div className="fixed inset-0 z-[300] bg-background-dark flex flex-col animate-in slide-in-from-bottom duration-300">
                    <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-background-dark/95 backdrop-blur-md sticky top-0 z-10">
                        <button onClick={() => setIsEditProfileOpen(false)} className="text-sm font-bold text-white/60">Cancelar</button>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Editar Perfil</h3>
                        <button 
                            onClick={async () => {
                                setIsEditProfileOpen(false);
                                if (user?.id && profileData) {
                                    setLoading(true);
                                    try {
                                        const { error } = await supabase
                                            .from('profiles')
                                            .update({
                                                name: profileData.name,
                                                bio: profileData.bio,
                                                avatar_url: profileData.avatar_url,
                                                username: profileData.username
                                            })
                                            .eq('id', user.id);
                                        
                                        if (error) throw error;
                                        alert('Perfil atualizado com sucesso!');
                                        if (onProfileUpdate) onProfileUpdate();
                                    } catch (err) {
                                        console.error(err);
                                        alert('Erro ao salvar. Verifique se o username já existe.');
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="text-sm font-black uppercase tracking-widest text-[#ECA413]"
                        >
                            Concluir
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-32 h-32 rounded-full border-4 border-[#ECA413] p-1 mb-6 active:scale-95 transition-transform cursor-pointer"
                        >
                            <img src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`} className="w-full h-full rounded-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                                <span className="material-icons text-white text-3xl">photo_camera</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ECA413] mb-12 hover:underline"
                        >
                            Alterar foto do perfil
                        </button>
                        
                        {/* Hidden File Input */}
                        <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />

                        <div className="w-full space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Nome</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:border-[#ECA413] outline-none transition-all"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData((prev: any) => prev ? {...prev, name: e.target.value} : null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Username</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:border-[#ECA413] outline-none transition-all"
                                    value={profileData.username}
                                    onChange={(e) => setProfileData((prev: any) => prev ? {...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '')} : null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Bio</label>
                                <textarea 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:border-[#ECA413] outline-none transition-all"
                                    rows={4}
                                    value={profileData.bio}
                                    onChange={(e) => setProfileData((prev: any) => prev ? {...prev, bio: e.target.value} : null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Modal */}
            {listModalType && (
                <div className="fixed inset-0 z-[400] bg-black/80 flex items-end sm:items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-background-dark w-full sm:w-[500px] h-[75vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl border border-white/10 flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl">
                        <header className="px-6 py-5 flex items-center justify-between border-b border-white/5 relative">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#ECA413] mx-auto">{listModalType === 'FOLLOWERS' ? 'Seguidores' : 'Seguindo'}</h3>
                            <button onClick={() => setListModalType(null)} className="material-icons text-white/40 hover:text-white transition-colors absolute right-6">close</button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4">
                            {listModalLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-[#ECA413] border-t-white/10 rounded-full animate-spin" />
                                </div>
                            ) : listModalData.length === 0 ? (
                                <div className="text-center py-16">
                                    <span className="material-icons text-5xl text-white/10 mb-4">group_off</span>
                                    <p className="text-white/40 text-xs font-black uppercase tracking-widest">Lista Vazia</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {listModalData.map((p, i) => (
                                        <div 
                                            key={i} 
                                            className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-3 rounded-2xl border border-transparent hover:border-white/5 transition-all"
                                            onClick={() => {
                                                setListModalType(null);
                                                window.dispatchEvent(new CustomEvent('arena_navigate', { detail: { view: 'PROFILE', username: p.username } }));
                                            }}
                                        >
                                            <div className="w-12 h-12 rounded-full border-2 border-[#ECA413]/20 overflow-hidden shrink-0">
                                                <img src={p.avatar_url || `https://ui-avatars.com/api/?name=${p.name}`} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white truncate">{p.name}</p>
                                                <p className="text-[11px] text-[#ECA413] lowercase truncate">@{p.username}</p>
                                            </div>
                                            <button className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 font-black text-[9px] uppercase tracking-widest transition-colors shrink-0">
                                                Ver
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileView;
