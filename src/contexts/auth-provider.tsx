
"use client";

import { useState, useEffect, createContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { auth, db } from '@/lib/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';

type CustomerData = {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  apiKey?: string;
  createdAt?: Timestamp;
  renewalDate?: Timestamp;
};

interface AuthContextType {
  user: User | null;
  customerData: CustomerData | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({ user: null, customerData: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        const unsubCustomer = onSnapshot(doc(db, "customers", user.uid), 
          (doc) => {
            if (doc.exists()) {
              setCustomerData({ id: doc.id, ...doc.data() } as CustomerData);
            } else {
              setCustomerData(null); // Could be admin or user without customer doc
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching customer data:", error);
            setCustomerData(null);
            setLoading(false);
          }
        );
        // Clean up customer subscription on logout
        return () => unsubCustomer();
      } else {
        setUser(null);
        setCustomerData(null);
        setLoading(false);
      }
    });

    // Clean up auth subscription
    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, customerData, loading }}>
      {loading ? (
         <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
            </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
