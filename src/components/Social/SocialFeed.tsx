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
import { nl } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface SocialFeedProps {
  onSelectUser: (user: UserProfile) => void;
  onSelectChat: (user: UserProfile) => void;
}

export default function SocialFeed({ onSelectUser, onSelectChat }: SocialFeedProps) {
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
        <div className="bg-white border border-editorial-border p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <img 
              src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
              alt="Avatar" 
              className="w-20 h-20 rounded-none border border-editorial-border mb-4"
            />
            <h2 className="text-xl font-serif italic font-bold leading-tight">{userProfile?.displayName}</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-editorial-border pt-6">
            <div 
              className="text-center cursor-pointer group/stat"
              onClick={() => setShowFollowingModal(true)}
            >
              <span className="block text-2xl font-serif font-black group-hover/stat:text-editorial-accent transition-colors">{counts.following}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-black/40 group-hover/stat:text-editorial-accent transition-colors">Volgend</span>
            </div>
            <div 
              className="text-center border-l border-editorial-border cursor-pointer group/stat"
              onClick={() => setShowFollowers(true)}
            >
              <span className="block text-2xl font-serif font-black group-hover/stat:text-editorial-accent transition-colors">{counts.followers}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-black/40 group-hover/stat:text-editorial-accent transition-colors">Volgers</span>
            </div>
          </div>
        </div>

        <div className="bg-editorial-bg border border-editorial-border p-6 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-accent italic border-b border-editorial-border pb-2">Suggesties</h3>
          <p className="text-[10px] text-black/40 font-serif italic text-center py-4">Zoek gebruikers om je netwerk uit te breiden</p>
        </div>
      </div>

      {/* Main Feed */}
      <div className="col-span-12 lg:col-span-6 space-y-10">
        <div className="pb-4 border-b border-editorial-border mb-8">
           <h2 className="text-4xl font-serif font-black tracking-tight italic">Gemeenschap</h2>
           <p className="text-sm font-serif italic text-black/40">Recente activiteiten van mede-lezers</p>
        </div>

        <div className="space-y-12">
          {activities.length === 0 ? (
            <div className="text-center py-20 opacity-30 italic font-serif">
               Er is nog geen activiteit...
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
                  onDelete={userService.isAdmin(auth.currentUser?.email) ? () => {
                    if (activity.id && window.confirm('Activiteit verwijderen?')) {
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
          <div className="bg-white border border-editorial-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-editorial-accent" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest italic">Vandaag Populair</h3>
            </div>
            <div className="space-y-4">
               {popularBooks.length > 0 ? (
                 popularBooks.map((book, idx) => (
                   <div key={idx} className="pb-4 border-b border-editorial-border last:border-0 last:pb-0">
                      <p className="text-xs font-bold leading-tight uppercase tracking-tight">{book.title}</p>
                      <p className="text-[9px] text-black/40 uppercase font-black mt-1">
                        {book.count} {book.count === 1 ? 'lezer' : 'lezers'} momenteel
                      </p>
                   </div>
                 ))
               ) : (
                 <p className="text-[10px] text-black/40 italic font-serif">Nog geen trends op dit moment.</p>
               )}
            </div>
          </div>
         
         <button 
           onClick={() => setShowSearch(true)}
           className="w-full bg-editorial-text text-white p-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-xl"
         >
           <Users size={14} /> Zoek Gebruikers
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
              className="bg-editorial-bg w-full max-w-xl border border-editorial-border shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-editorial-border flex items-center justify-between">
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic">Zoek Gebruikers</h3>
                <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-black/5 opacity-40 hover:opacity-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 bg-white border-b border-editorial-border flex items-center gap-3">
                <Search size={16} className="text-black/30" />
                <input 
                  type="text" 
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  placeholder="Typ een naam..."
                  className="flex-1 bg-transparent border-none text-sm focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredUsers.map(user => (
                  <div 
                    key={user.uid}
                    className="flex items-center justify-between p-4 bg-white border border-editorial-border hover:border-editorial-accent transition-all group"
                  >
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => { onSelectUser(user); setShowSearch(false); }}>
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-10 h-10 border border-editorial-border" />
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-tight group-hover:text-editorial-accent">{user.displayName}</h4>
                        <p className="text-[10px] text-black/40 italic font-serif">{user.city || 'Onbekend'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button 
                        onClick={() => handleFollowToggle(user.uid)}
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-4 py-2 border transition-all",
                          following.has(user.uid) 
                            ? "text-black/30 border-editorial-border" 
                            : "bg-editorial-accent border-editorial-accent text-white hover:bg-neutral-800"
                        )}
                      >
                        {following.has(user.uid) ? 'Volgend' : 'Volgen'}
                      </button>
                      {userService.isAdmin(auth.currentUser?.email) && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Weet je zeker dat je ${user.displayName} wilt verwijderen?`)) {
                              userService.deleteUser(user.uid);
                            }
                          }}
                          className="text-[8px] font-bold uppercase tracking-widest text-red-500 hover:underline px-2"
                        >
                          Verwijder Gebruiker
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center py-12 text-sm italic text-black/30">Geen gebruikers gevonden</p>
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
              className="bg-editorial-bg w-full max-w-xl border border-editorial-border shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-editorial-border flex items-center justify-between">
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic">Mijn Volgers</h3>
                <button onClick={() => setShowFollowers(false)} className="p-2 hover:bg-black/5 opacity-40 hover:opacity-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {followersList.map(follower => {
                  const user = allUsers.find(u => u.uid === follower.uid) || follower;
                  return (
                    <div 
                      key={user.uid}
                      className="flex items-center justify-between p-4 bg-white border border-editorial-border hover:border-editorial-accent transition-all group"
                    >
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => { onSelectUser(user); setShowFollowers(false); }}>
                        <img 
                          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                          className="w-10 h-10 border border-editorial-border object-cover" 
                        />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-tight group-hover:text-editorial-accent">{user.displayName}</h4>
                          <p className="text-[10px] text-black/40 italic font-serif">{user.city || 'Onbekend'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => handleFollowToggle(user.uid)}
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-4 py-2 border transition-all",
                            following.has(user.uid) 
                              ? "text-black/30 border-editorial-border hover:text-black hover:border-black" 
                              : "bg-editorial-accent border-editorial-accent text-white hover:bg-neutral-800"
                          )}
                        >
                          {following.has(user.uid) ? 'Volgend' : 'Volg terug'}
                        </button>
                        {userService.isAdmin(auth.currentUser?.email) && (
                          <button 
                            onClick={() => {
                              if (window.confirm(`Weet je zeker dat je ${user.displayName} wilt verwijderen?`)) {
                                userService.deleteUser(user.uid);
                              }
                            }}
                            className="text-[8px] font-bold uppercase tracking-widest text-red-500 hover:underline px-2"
                          >
                            Verwijder Gebruiker
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {followersList.length === 0 && (
                  <p className="text-center py-12 text-sm italic text-black/30">Nog geen volgers</p>
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
              className="bg-editorial-bg w-full max-w-xl border border-editorial-border shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-editorial-border flex items-center justify-between">
                <h3 className="text-xl font-serif font-black uppercase tracking-tight italic">Ik volg</h3>
                <button onClick={() => setShowFollowingModal(false)} className="p-2 hover:bg-black/5 opacity-40 hover:opacity-100 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {followingList.map(followingUser => {
                  const user = allUsers.find(u => u.uid === followingUser.uid) || followingUser;
                  return (
                    <div 
                      key={user.uid}
                      className="flex items-center justify-between p-4 bg-white border border-editorial-border hover:border-editorial-accent transition-all group"
                    >
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => { onSelectUser(user); setShowFollowingModal(false); }}>
                        <img 
                          src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                          className="w-10 h-10 border border-editorial-border object-cover" 
                        />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-tight group-hover:text-editorial-accent">{user.displayName}</h4>
                          <p className="text-[10px] text-black/40 italic font-serif">{user.city || 'Onbekend'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => handleFollowToggle(user.uid)}
                          className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 border text-black/30 border-editorial-border hover:text-black hover:border-black transition-all"
                        >
                          Ontvolgen
                        </button>
                        {userService.isAdmin(auth.currentUser?.email) && (
                          <button 
                            onClick={() => {
                              if (window.confirm(`Weet je zeker dat je ${user.displayName} wilt verwijderen?`)) {
                                userService.deleteUser(user.uid);
                              }
                            }}
                            className="text-[8px] font-bold uppercase tracking-widest text-red-500 hover:underline px-2"
                          >
                            Verwijder Gebruiker
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {followingList.length === 0 && (
                  <p className="text-center py-12 text-sm italic text-black/30">Je volgt nog niemand</p>
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
  onDelete?: () => void
}> = ({ activity, isFollowing, isSelf, onFollow, onSelectUser, onChat, onDelete }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-l-2 border-editorial-border hover:border-editorial-accent transition-all p-8 shadow-sm group"
    >
      <div className="flex items-start gap-4 mb-8">
        <img 
          src={activity.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} 
          alt="Avatar" 
          className="w-12 h-12 rounded-none border border-editorial-border cursor-pointer hover:border-editorial-accent transition-colors"
          onClick={onSelectUser}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 
                className="font-serif italic font-black text-lg cursor-pointer hover:text-editorial-accent"
                onClick={onSelectUser}
              >
                {activity.userName}
              </h4>
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 text-black/20 hover:text-red-500 transition-colors"
                  title="Verwijder activiteit"
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
                      ? "text-black/30 border-editorial-border hover:text-red-500 hover:border-red-500" 
                      : "text-editorial-accent border-editorial-accent hover:bg-editorial-accent hover:text-white"
                  )}
                >
                  {isFollowing ? <UserMinus size={10} /> : <UserPlus size={10} />}
                  {isFollowing ? 'Volgend' : 'Volgen'}
                </button>
                {isFollowing && (
                  <button 
                    onClick={onChat}
                    className="text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 border border-editorial-text text-editorial-text hover:bg-editorial-text hover:text-white transition-all flex items-center gap-1"
                  >
                    <MessageCircle size={10} /> Chat
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-black/40 font-sans font-bold flex items-center gap-1.5 uppercase tracking-wider mt-1">
            <Clock size={10} /> 
            {formatDistanceToNow(activity.createdAt?.toDate() || new Date(), { addSuffix: true, locale: nl })}
          </p>
        </div>
      </div>

      <div className="pl-16 space-y-6">
        <div className="text-editorial-text text-sm font-serif leading-relaxed">
          {activity.type === 'START_READING' && (
             <p>Is begonnen met het lezen van <span className="font-bold italic">"{activity.bookTitle}"</span></p>
          )}
          {activity.type === 'FINISH_READING' && (
             <p>Heeft <span className="font-bold italic">"{activity.bookTitle}"</span> uitgelezen!</p>
          )}
          {activity.type === 'RATE_BOOK' && (
             <div className="space-y-4">
                <p>Heeft <span className="font-bold italic">"{activity.bookTitle}"</span> gewaardeerd:</p>
                <div className="flex text-editorial-accent text-sm gap-1">
                   {[1, 2, 3, 4, 5].map(s => (
                     <Star key={s} size={14} className={s <= (activity.rating || 0) ? "fill-editorial-accent" : "text-neutral-100"} />
                   ))}
                </div>
                {activity.review && (
                  <blockquote className="border-l-2 border-editorial-accent/20 pl-6 py-2 italic text-black/60 relative">
                     <span className="absolute -left-2 top-0 text-4xl text-editorial-accent/10 font-serif leading-none">"</span>
                     {activity.review}
                  </blockquote>
                )}
             </div>
          )}
        </div>

        {activity.bookCover && (
          <div className="flex gap-6 items-center pt-4 group/book cursor-pointer" onClick={onSelectUser}>
            <div className="w-16 h-24 bg-neutral-100 border border-editorial-border overflow-hidden shadow-md group-hover/book:border-editorial-accent transition-all">
              <img src={activity.bookCover} alt="Cover" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1">
               <p className="text-xs font-bold uppercase tracking-widest group-hover/book:text-editorial-accent transition-colors">{activity.bookTitle}</p>
               <p className="text-[9px] font-serif italic text-black/40">Bekijk de bibliotheek van {activity.userName}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

