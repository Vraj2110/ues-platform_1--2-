import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { app } from "@/lib/firebase";

export const db = typeof window !== "undefined"
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app);

