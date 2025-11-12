import { io } from "socket.io-client";
import { getAuth } from "firebase/auth";

const socket = io( process.env.NEXT_PUBLIC_URL || "http://localhost:8080", {
  transports: ["websocket"],
  autoConnect: false,
});

export const connectSocket = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  let token = null;

  if (user) token = await user.getIdToken();
  else token = localStorage.getItem("token");

  if (token) {
    socket.connect();
    socket.emit("register", token);
  }
};

export default socket;
