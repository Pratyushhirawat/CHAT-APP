import { AuthState, User } from "@/types";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from  "axios"
import { API_BASE_URL } from "@/constants/config";
import { useAuth, useUser } from "@clerk/expo";

export const api = axios.create({ baseURL: API_BASE_URL })

const _tokenRef = { current: null as string | null }

interface AppContextType {
    auth: AuthState;
    logout: () => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>
}


const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({children} : {children: ReactNode}) {

    const [auth, setAuth] = useState<AuthState>({token: null, user: null, loading: true})
    const [users, setUsers] = useState<User[]>([])

    const {getToken, isLoaded: authLoaded, isSignedIn, signOut} = useAuth()
    const {user: clerkUser, isLoaded: userLoaded } = useUser()

    const getTokenRef = useRef(getToken)


    useEffect(()=>{
        getTokenRef.current = getToken;
    },[getToken])

    useEffect(()=> {
        const interceptor= api.interceptors.request.use(async (config) => {
            try {
                if(isSignedIn){
                    const token = await getTokenRef.current();
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                        _tokenRef.current = token;
                    }
                }
            } catch (err) {
                console.error("Axios interceptor error:", err)
            }
            return config;
        })
        return () => {
            api.interceptors.request.eject(interceptor)
        }
    },[isSignedIn])


    useEffect(()=> {
        if(!authLoaded || !userLoaded) return;

        if (isSignedIn && clerkUser) {
            const mappedUser: User = {
                _id: clerkUser.id,
                name: clerkUser.fullName || "Anonymus",
                email: clerkUser.primaryEmailAddress?.emailAddress || "",
                handle: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0] || clerkUser.id,
                avatar: clerkUser.imageUrl || "",
                bio: (clerkUser.publicMetadata?.bio as string) || "Hey there I am using InstaChat.",
                isOnline: true,
                lastSeen: new Date().toISOString(),
            }
            setAuth({ token: _tokenRef.current, user: mappedUser, loading: false })
        }else {
            setAuth({ token: null, user: null, loading: false })
        }
    },[isSignedIn, authLoaded, userLoaded, clerkUser])

    const logout = useCallback(async () => {
        _tokenRef.current = null;
        await signOut();
        setAuth({ token: null, user: null, loading: false })
    },[signOut])

     const updateUser = useCallback(async (user: User) => {
        setAuth((prev) => ({...prev, user}))
    },[])

    return (
        <AppContext.Provider value={{auth, logout, updateUser, users, setUsers}}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const ctx = useContext(AppContext);
    if(!ctx) throw new Error("useApp must be used inside AppProvider")
        return ctx;
}