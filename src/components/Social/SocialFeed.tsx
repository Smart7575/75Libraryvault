import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Star, 
  MessageCircle, 
  UserPlus, 
  UserMinus,
  TrendingUp,
  Clock,
  ExternalLink,
  Search,
  X,
  Trash2
} from 'lucide-react';
import { Activity, socialService } from '../../services/socialService';
import { UserProfile, userService } from '../../services/userService';
import { Book, bookService } from '../../services/bookService';
import { auth } from '../../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { nl, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../lib/LanguageContext';

interface SocialFeedProps {
  onSelectUser: (user: UserProfile) => void;
  onSelectChat: (user: UserProfile) => void;
  isDarkMode?: boolean;
}

export default function SocialFeed({ onSelectUser, onSelectChat, isDarkMode }: SocialFeedProps) {
  const { t, language } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [popularBooks, setPopularBooks] = useState<{ title: string, count: number, authors: string[] }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [userQuery, setUserQuery] = useState('');

  useEffect(() => {
    if (auth.currentUser) {
      userService.getProfile(auth.currentUser.uid).then(setUserProfile);
      socialService.getFollowCounts(auth.currentUser.uid).then(setCounts);
      bookService.getPopularBooks().then(setPopularBooks);
      
      const unsubscribe = socialService.getActivities((data) => {
        setActivities(data);
      });

      // Fetch following status, all users and followers/following
      const fetchData = async () => {
        if (!auth.currentUser) return;
        
        const [users, followingIds, followers, followingProfiles] = await Promise.all([
          socialService.getAllUsers(),
          socialService.getFollowing(auth.currentUser.uid),
          socialService.getFollowers(auth.currentUser.uid),
          socialService.getFollowingProfiles(auth.currentUser.uid)
        ]);

        setAllUsers(users);
        setFollowing(new Set(followingIds));
        setFollowersList(followers);
        setFollowingList(followingProfiles);
      };
      
      fetchData();

      return () => unsubscribe();
    }
  }, []);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!auth.currentUser) return;
    
    try {
      if (following.has(targetUserId)) {
        await socialService.unfollowUser(auth.currentUser.uid, targetUserId);
        setFollowing(prev => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } else {
        await socialService.followUser(auth.currentUser.uid, targetUserId);
        setFollowing(prev => {
          const next = new Set(prev);
          next.add(targetUserId);
          return next;
        });
      }
      // Refresh counts and followers/following list
      const updatedCounts = await socialService.getFollowCounts(auth.currentUser.uid);
      setCounts(updatedCounts);
      const [updatedFollowers, updatedFollowing] = await Promise.all([
        socialService.getFollowers(auth.currentUser.uid),
        socialService.getFollowingProfiles(auth.currentUser.uid)
      ]);
      setFollowersList(updatedFollowers);
      setFollowingList(updatedFollowing);
    } catch (err) {
      console.error('Follow toggle error:', err);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.uid !== auth.currentUser?.uid && 
    u.displayName?.toLowerCase().includes(userQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-12 gap-10">
      {/* Sidebar: Profile Summary & Stats */}
      <div className="col-span-12 lg:col-span-3 space-y-8">
        <div className={cn(
          "border p-8 transition-colors",
          isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border"
        )}>
          <div className="flex flex-col items-center text-center mb-8">
            <img 
              src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
              alt="Avatar" 
              className={cn("w-20 h-20 rounded-none border mb-4", isDarkMode ? "border-zinc-800" : "border-editorial-border")}
            />
            <h2 className="text-xl font-serif italic font-bold leading-tight">{userProfile?.displayName}</h2>
          </div>
          
          <div className={cn("grid grid-cols-2 gap-4 border-t pt-6", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
            <div 
              className="text-center cursor-pointer group/stat"
              onClick={() => setShowFollowingModal(true)}
            >
              <span className={cn("block text-2xl font-serif font-black transition-colors", isDarkMode ? "group-hover/stat:text-editorial-accent-bright" : "group-hover/stat:text-editorial-accent")}>{counts.following}</span>
              <span className={cn("text-[9px] uppercase font-bold tracking-widest transition-colors", isDarkMode ? "text-white/60 group-hover/stat:text-editorial-accent-bright" : "text-black/40 group-hover/stat:text-editorial-accent")}>{t('social.following') || 'Volgend'}</span>
            </div>
            <div 
              className={cn("text-center border-l cursor-pointer group/stat", isDarkMode ? "border-zinc-800" : "border-editorial-border")}
              onClick={() => setShowFollowers(true)}
            >
              <span className={cn("block text-2xl font-serif font-black transition-colors", isDarkMode ? "group-hover/stat:text-editorial-accent-bright" : "group-hover/stat:text-editorial-accent")}>{counts.followers}</span>
              <span className={cn("text-[9px] uppercase font-bold tracking-widest transition-colors", isDarkMode ? "text-white/60 group-hover/stat:text-editorial-accent-bright" : "text-black/40 group-hover/stat:text-editorial-accent")}>{t('social.followers') || 'Volgers'}</span>
            </div>
          </div>
        </div>

        <div className={cn("border p-6 space-y-4", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-editorial-bg border-editorial-border")}>
          <h3 className={cn("text-[10px] font-bold uppercase tracking-[0.2em] italic border-b pb-2", isDarkMode ? "text-editorial-accent-bright border-zinc-800" : "text-editorial-accent border-editorial-border")}>{t('social.suggestions') || 'Suggesties'}</h3>
          <p className={cn("text-[10px] font-serif italic text-center py-4", isDarkMode ? "text-white" : "text-black/40")}>{t('social.suggestionsDesc') || 'Zoek gebruikers om je netwerk uit te breiden'}</p>
        </div>
      </div>

      {/* Main Feed */}
      <div className="col-span-12 lg:col-span-6 space-y-10">
        <div className={cn("pb-4 border-b mb-8", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
           <h2 className="text-4xl font-serif font-black tracking-tight italic">{t('social.community') || 'Gemeenschap'}</h2>
           <p className={cn("text-sm font-serif italic", isDarkMode ? "text-white" : "text-black/40")}>{t('social.communityDesc') || 'Recente activiteiten van mede-lezers'}</p>
        </div>

        <div className="space-y-12">
          {activities.length === 0 ? (
            <div className={cn("text-center py-20 italic font-serif", isDarkMode ? "text-zinc-800" : "opacity-30")}>
               {t('social.noActivity') || 'Er is nog geen activiteit...'}
            </div>
          ) : (
            activities.map((activity) => {
              const profile = allUsers.find(u => u.uid === activity.userId);
              return (
                <ActivityItem 
                  key={activity.id} 
                  activity={{
                    ...activity,
                    userName: profile?.displayName || activity.userName,
                    userPhoto: profile?.photoURL || activity.userPhoto
                  }} 
                  isFollowing={following.has(activity.userId)}
                  isSelf={activity.userId === auth.currentUser?.uid}
                  onFollow={() => handleFollowToggle(activity.userId)}
                  onSelectUser={() => {
                    userService.getProfile(activity.userId).then(u => u && onSelectUser(u));
                  }}
                  onChat={() => {
                     userService.getProfile(activity.userId).then(u => u && onSelectChat(u));
                  }}
                  isDarkMode={isDarkMode}
                  onDelete={userService.isAdmin(auth.currentUser?.email) ? () => {
                    if (activity.id && window.confirm(t('social.confirmDelete') || 'Activiteit verwijderen?')) {
                      socialService.deleteActivity(activity.id);
                    }
                  } : undefined}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar: Trends/Global Stats */}
      <div className="col-span-12 lg:col-span-3 space-y-8">
          <div className={cn("border p-6", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-editorial-border")}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className={isDarkMode ? "text-editorial-accent-bright" : "text-editorial-accent"} />
              <h3 className={cn("text-[10px] font-bold uppercase tracking-widest italic", isDarkMode ? "text-editorial-accent-bright" : "text-black/40")}>{t('social.todayPopular') || 'Vandaag Populair'}</h3>
            </div>
            <div className="space-y-4">
               {popularBooks.length > 0 ? (
                 popularBooks.map((book, idx) => (
                    <div key={idx} className={cn("pb-4 border-b last:border-0 last:pb-0 font-serif mb-2", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                      <p className={cn("text-xs font-bold leading-tight uppercase tracking-tight", isDarkMode ? "text-white" : "text-editorial-text")}>{book.title}</p>
                      <p className={cn("text-[9px] uppercase font-black mt-1", isDarkMode ? "text-white/40" : "text-black/40")}>
                        {t('social.readersNow', { count: book.count })}
                      </p>
                    </div>
                 ))
               ) : (
                 <p className={cn("text-[10px] italic font-serif", isDarkMode ? "text-white/20" : "text-black/40")}>{t('social.noTrends') || 'Nog geen trends op dit moment.'}</p>
               )}
            </div>
          </div>
         
         <button 
           onClick={() => setShowSearch(true)}
           className={cn(
             "w-full p-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors shadow-xl",
             isDarkMode ? "bg-zinc-100 text-zinc-900 hover:bg-neutral-200" : "bg-editorial-text text-white hover:bg-neutral-800"
           )}
         >
           <Users size={14} /> {t('social.searchUsers') || 'Zoek Gebruikers'}
         </button>
      </div>

      {/* User Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-xl border shadow-2xl flex flex-col max-h-[80vh] transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-editorial-bg border-editorial-border text-editorial-text"
              )}
            >
              <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic">{t('social.searchUsers') || 'Zoek Gebruikers'}</h3>
                <button onClick={() => setShowSearch(false)} className={cn("p-2 transition-all", isDarkMode ? "text-zinc-500 hover:text-zinc-200" : "hover:bg-black/5 opacity-40 hover:opacity-100")}>
                  <X size={20} />
                </button>
              </div>
              <div className={cn("p-4 border-b flex items-center gap-3 transition-colors", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-editorial-border")}>
                <Search size={16} className={cn(isDarkMode ? "text-white/40" : "text-black/30")} />
                <input 
                  type="text" 
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  placeholder={t('social.searchUsersPlaceholder') || 'Typ een naam...'}
                  className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-white/40"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredUsers.map(user => (
                  <div 
                    key={user.uid}
                    className={cn(
                      "flex items-center justify-between p-4 border transition-all group",
                      isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-editorial-accent-bright" : "bg-white border-editorial-border hover:border-editorial-accent"
                    )}
                  >
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => { onSelectUser(user); setShowSearch(false); }}>
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className={cn("w-10 h-10 border", isDarkMode ? "border-zinc-800" : "border-editorial-border")} />
                      <div>
                        <h4 className={cn("text-sm font-bold uppercase tracking-tight", isDarkMode ? "group-hover:text-editorial-accent-bright" : "group-hover:text-editorial-accent")}>{user.displayName}</h4>
                        <p className={cn("text-[10px] italic font-serif", isDarkMode ? "text-white/40" : "text-black/40")}>{user.city || (t('social.unknownLocation') || 'Onbekend')}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button 
                        onClick={() => handleFollowToggle(user.uid)}
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-4 py-2 border transition-all",
                          following.has(user.uid) 
                            ? (isDarkMode ? "text-white/20 border-zinc-800" : "text-black/30 border-editorial-border")
                            : (isDarkMode ? "bg-white text-zinc-900 border-white hover:bg-neutral-200" : "bg-editorial-accent border-editorial-accent text-white hover:bg-neutral-800")
                        )}
                      >
                        {following.has(user.uid) ? (t('social.followed') || 'Volgend') : (t('social.follow') || 'Volgen')}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className={cn("text-center py-12 text-sm italic", isDarkMode ? "text-white/40" : "text-black/30")}>{t('social.nothingFound') || 'Geen gebruikers gevonden'}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Followers Modal */}
      <AnimatePresence>
        {showFollowers && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-xl border shadow-2xl flex flex-col max-h-[80vh] transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-editorial-bg border-editorial-border text-editorial-text"
              )}
            >
              <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic">{t('social.myFollowers') || 'Mijn Volgers'}</h3>
                <button onClick={() => setShowFollowers(false)} className={cn("p-2 transition-all", isDarkMode ? "text-zinc-500 hover:text-zinc-200" : "hover:bg-black/5 opacity-40 hover:opacity-100")}>
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {followersList.map(follower => {
                  const user = allUsers.find(u => u.uid === follower.uid) || follower;
                  return (
                    <div 
                      key={user.uid}
                      className={cn(
                        "flex items-center justify-between p-4 border transition-all group",
                        isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-editorial-accent" : "bg-white border-editorial-border hover:border-editorial-accent"
                      )}
                    >
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => { onSelectUser(user); setShowFollowers(false); }}>
                        <img 
                          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                          className={cn("w-10 h-10 border object-cover", isDarkMode ? "border-zinc-800" : "border-editorial-border")} 
                        />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-tight group-hover:text-editorial-accent">{user.displayName}</h4>
                          <p className={cn("text-[10px] italic font-serif", isDarkMode ? "text-zinc-600" : "text-black/40")}>{user.city || (t('social.unknownLocation') || 'Onbekend')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => handleFollowToggle(user.uid)}
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-4 py-2 border transition-all",
                            following.has(user.uid) 
                              ? (isDarkMode ? "text-zinc-600 border-zinc-800 hover:text-zinc-200" : "text-black/30 border-editorial-border hover:text-black hover:border-black") 
                              : (isDarkMode ? "bg-zinc-100 text-zinc-900 border-zinc-100 hover:bg-white" : "bg-editorial-accent border-editorial-accent text-white hover:bg-neutral-800")
                          )}
                        >
                          {following.has(user.uid) ? (t('social.followed') || 'Volgend') : (t('social.followBack') || 'Volg terug')}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {followersList.length === 0 && (
                  <p className={cn("text-center py-12 text-sm italic", isDarkMode ? "text-zinc-800" : "text-black/30")}>{t('social.noFollowers') || 'Nog geen volgers'}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Following Modal */}
      <AnimatePresence>
        {showFollowingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-xl border shadow-2xl flex flex-col max-h-[80vh] transition-colors",
                isDarkMode ? "bg-zinc-900 border-zinc-800 text-neutral-100" : "bg-editorial-bg border-editorial-border text-editorial-text"
              )}
            >
              <div className={cn("p-6 border-b flex items-center justify-between", isDarkMode ? "border-zinc-800" : "border-editorial-border")}>
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic">{t('social.iFollow') || 'Ik volg'}</h3>
                <button onClick={() => setShowFollowingModal(false)} className={cn("p-2 transition-all", isDarkMode ? "text-zinc-500 hover:text-zinc-200" : "hover:bg-black/5 opacity-40 hover:opacity-100")}>
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {followingList.map(followingUser => {
                  const user = allUsers.find(u => u.uid === followingUser.uid) || followingUser;
                  return (
                    <div 
                      key={user.uid}
                      className={cn(
                        "flex items-center justify-between p-4 border transition-all group",
                        isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-editorial-accent" : "bg-white border-editorial-border hover:border-editorial-accent"
                      )}
                    >
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => { onSelectUser(user); setShowFollowingModal(false); }}>
                        <img 
                          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                          className={cn("w-10 h-10 border object-cover", isDarkMode ? "border-zinc-800" : "border-editorial-border")} 
                        />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-tight group-hover:text-editorial-accent">{user.displayName}</h4>
                          <p className={cn("text-[10px] italic font-serif", isDarkMode ? "text-zinc-600" : "text-black/40")}>{user.city || (t('social.unknownLocation') || 'Onbekend')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => handleFollowToggle(user.uid)}
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-4 py-2 border transition-all",
                            isDarkMode ? "text-zinc-600 border-zinc-800 hover:text-red-500 hover:border-red-500" : "text-black/30 border-editorial-border hover:text-black hover:border-black"
                          )}
                        >
                          {t('social.unfollow') || 'Ontvolgen'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {followingList.length === 0 && (
                  <p className={cn("text-center py-12 text-sm italic", isDarkMode ? "text-zinc-800" : "text-black/30")}>{t('social.noFollowing') || 'Je volgt nog niemand'}</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ActivityItem: React.FC<{ 
  activity: Activity, 
  isFollowing: boolean, 
  isSelf: boolean,
  onFollow: () => void | Promise<void>,
  onSelectUser: () => void,
  onChat: () => void,
  isDarkMode?: boolean,
  onDelete?: () => void
}> = ({ activity, isFollowing, isSelf, onFollow, onSelectUser, onChat, isDarkMode, onDelete }) => {
  const { t, language } = useLanguage();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border-l-2 transition-all p-8 shadow-sm group",
        isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-editorial-accent" : "bg-white border-editorial-border hover:border-editorial-accent"
      )}
    >
      <div className="flex items-start gap-4 mb-8">
        <img 
          src={activity.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} 
          alt="Avatar" 
          className={cn("w-12 h-12 rounded-none border cursor-pointer transition-colors", isDarkMode ? "border-zinc-800 hover:border-editorial-accent-bright" : "border-editorial-border hover:border-editorial-accent")}
          onClick={onSelectUser}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 
                className={cn("font-serif italic font-black text-lg cursor-pointer transition-colors", isDarkMode ? "hover:text-editorial-accent-bright" : "hover:text-editorial-accent")}
                onClick={onSelectUser}
              >
                {activity.userName}
              </h4>
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className={cn("p-1.5 transition-colors", isDarkMode ? "text-white/20 hover:text-red-500" : "text-black/20 hover:text-red-500")}
                  title={t('social.deleteActivity') || "Verwijder activiteit"}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {!isSelf && (
              <div className="flex gap-2">
                <button 
                  onClick={onFollow}
                  className={cn(
                    "text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-all flex items-center gap-1",
                    isFollowing 
                      ? (isDarkMode ? "text-white border-zinc-800 hover:text-red-500 hover:border-red-500" : "text-black/30 border-editorial-border hover:text-red-500 hover:border-red-500") 
                      : (isDarkMode ? "text-editorial-accent-bright border-editorial-accent-bright hover:bg-white hover:text-zinc-900" : "text-editorial-accent border-editorial-accent hover:bg-editorial-accent hover:text-white")
                  )}
                >
                  {isFollowing ? <UserMinus size={10} /> : <UserPlus size={10} />}
                  {isFollowing ? (t('social.followed') || 'Volgend') : (t('social.follow') || 'Volgen')}
                </button>
                {isFollowing && (
                  <button 
                    onClick={onChat}
                    className={cn(
                      "text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-all flex items-center gap-1",
                      isDarkMode ? "border-white text-white hover:bg-white hover:text-zinc-900" : "border-editorial-text text-editorial-text hover:bg-editorial-text hover:text-white"
                    )}
                  >
                    <MessageCircle size={10} /> {t('social.message')}
                  </button>
                )}
              </div>
            )}
          </div>
          <p className={cn("text-[10px] font-sans font-bold flex items-center gap-1.5 uppercase tracking-wider mt-1", isDarkMode ? "text-white" : "text-black/40")}>
            <Clock size={10} /> 
            {formatDistanceToNow(activity.createdAt?.toDate() || new Date(), { 
              addSuffix: true, 
              locale: language === 'nl' ? nl : enUS 
            })}
          </p>
        </div>
      </div>

      <div className="pl-16 space-y-6">
        <div className={cn("text-sm font-serif leading-relaxed", isDarkMode ? "text-white" : "text-editorial-text")}>
          {activity.type === 'START_READING' && (
             <p>{t('social.activities.started') || 'Is begonnen met het lezen van'} <span className="font-bold italic">"{activity.bookTitle}"</span></p>
          )}
          {activity.type === 'FINISH_READING' && (
             <p>{t('social.activities.finished') || 'Heeft'} <span className="font-bold italic">"{activity.bookTitle}"</span> {t('social.activities.finishedEnd') || 'uitgelezen!'}</p>
          )}
          {activity.type === 'RATE_BOOK' && (
             <div className="space-y-4">
                <p>{t('social.activities.rated') || 'Heeft'} <span className="font-bold italic">"{activity.bookTitle}"</span> {t('social.activities.ratedEnd') || 'gewaardeerd:'}</p>
                <div className={cn("text-sm gap-1 flex", isDarkMode ? "text-white" : "text-editorial-accent")}>
                   {[1, 2, 3, 4, 5].map(s => {
                     const isFilled = s <= (activity.rating || 0);
                     return (
                       <Star 
                         key={s} 
                         size={14} 
                         strokeWidth={isFilled ? 1.5 : 2}
                         className={cn(
                           isFilled ? (isDarkMode ? "fill-editorial-accent-bright" : "fill-current") : "fill-transparent"
                         )} 
                       />
                     );
                   })}
                </div>
                {activity.review && (
                  <blockquote className={cn("border-l-2 pl-6 py-2 italic relative", isDarkMode ? "border-zinc-800 text-white" : "border-editorial-accent/20 text-black/60")}>
                     <span className={cn("absolute -left-2 top-0 text-4xl font-serif leading-none", isDarkMode ? "text-editorial-accent-bright/10" : "text-editorial-accent/10")}>"</span>
                     {activity.review}
                  </blockquote>
                )}
             </div>
          )}
        </div>

        {activity.bookCover && (
          <div className="flex gap-6 items-center pt-4 group/book cursor-pointer" onClick={onSelectUser}>
            <div className={cn("w-16 h-24 overflow-hidden shadow-md transition-all border", isDarkMode ? "bg-zinc-950 border-zinc-800 group-hover/book:border-editorial-accent-bright" : "bg-neutral-100 border-editorial-border group-hover/book:border-editorial-accent")}>
              <img src={activity.bookCover} alt="Cover" className={cn("w-full h-full object-cover", isDarkMode ? "opacity-90" : "grayscale-0")} />
            </div>
            <div className="space-y-1">
               <p className={cn("text-xs font-bold uppercase tracking-widest transition-colors", isDarkMode ? "text-white group-hover/book:text-editorial-accent-bright" : "text-editorial-text group-hover/book:text-editorial-accent")}>{activity.bookTitle}</p>
               <p className={cn("text-[9px] font-serif italic", isDarkMode ? "text-white" : "text-black/40")}>{t('social.viewLibrary') || 'Bekijk de bibliotheek van'} {activity.userName}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

