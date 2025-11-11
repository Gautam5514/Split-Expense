"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuth } from "firebase/auth";
import toast from "react-hot-toast";

export default function JoinGroupPage() {
  const { inviteCode } = useParams();
  const router = useRouter();

  useEffect(() => {
    const joinGroup = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          localStorage.setItem("pendingInvite", inviteCode);
          return router.push("/login");
        }

        const token = await user.getIdToken();
        await api.post(`/groups/join/${inviteCode}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success("Joined group successfully!");
        router.push("/chat");
      } catch (err) {
        toast.error("Invalid or expired invite link.");
        router.push("/");
      }
    };
    joinGroup();
  }, [inviteCode]);

  return <p className="text-center mt-10 text-gray-600">Joining group...</p>;
}
