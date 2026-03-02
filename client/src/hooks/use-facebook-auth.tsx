import { useEffect } from "react";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

type FacebookStatus = "connected" | "not_authorized" | "unknown";

interface FacebookResponse {
  status: FacebookStatus;
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
  };
}

declare global {
  interface Window {
    FB: any;
    fbAsyncInit?: () => void;
  }
}

export function useFacebookAuth() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Only check if FB is available and user is not already logged in
    if (!window.FB || user) return;

    // Check login status on app load
    const handleStatusChange = (response: FacebookResponse) => {
      switch (response.status) {
        case "connected":
          // User is logged into Facebook and your app
          handleFacebookLogin(response.authResponse);
          break;

        case "not_authorized":
          // User is logged into Facebook but not your app
          // You can prompt them with login dialog or show login button
          console.log("Facebook user not authorized for this app");
          break;

        case "unknown":
          // User is not logged into Facebook
          // They cannot be logged in to your app
          console.log("User not logged into Facebook");
          break;

        default:
          console.log("Unknown Facebook status");
      }
    };

    // Fetch current login status
    // Using scope for email and public_profile
    window.FB.getLoginStatus(handleStatusChange);
  }, [user, loginMutation, toast]);

  const handleFacebookLogin = async (authResponse: FacebookResponse["authResponse"]) => {
    if (!authResponse) return;

    try {
      // Get user details from Facebook
      window.FB.api("/me", { fields: "id,name,email,picture" }, async (me: any) => {
        // Send to your backend to verify and create/update user
        const response = await fetch("/api/facebook-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: authResponse.accessToken,
            facebookId: me.id,
            name: me.name,
            email: me.email,
            picture: me.picture?.data?.url,
          }),
        });

        if (response.ok) {
          const user = await response.json();
          // Refetch user data
          window.location.href = "/";
        } else {
          toast({
            title: "Facebook Login Failed",
            description: "Unable to process your Facebook login. Please try again.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Facebook login error:", error);
      toast({
        title: "Facebook Login Error",
        description: error instanceof Error ? error.message : "An error occurred during Facebook login",
        variant: "destructive",
      });
    }
  };

  // Expose a manual Facebook login function for the login button
  const facebookLogin = () => {
    if (!window.FB) {
      toast({
        title: "Facebook SDK Not Ready",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    window.FB.login(
      (response: FacebookResponse) => {
        if (response.authResponse) {
          handleFacebookLogin(response.authResponse);
        } else {
          toast({
            title: "Facebook Login Cancelled",
            description: "You cancelled the Facebook login.",
            variant: "default",
          });
        }
      },
      { scope: "public_profile,email" }
    );
  };

  return { facebookLogin };
}
