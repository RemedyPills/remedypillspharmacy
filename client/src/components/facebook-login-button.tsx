import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit?: () => void;
  }
}

interface FacebookLoginButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: Error) => void;
  scope?: string;
  className?: string;
}

export function FacebookLoginButton({
  onSuccess,
  onError,
  scope = "public_profile,email",
  className = "h-12 w-full",
}: FacebookLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log("[FacebookLoginButton] Initializing...");
    
    // Wait for Facebook SDK to load
    const checkFBReady = setInterval(() => {
      if (window.FB) {
        console.log("[FacebookLoginButton] FB SDK ready, parsing XFBML");
        clearInterval(checkFBReady);
        // Parse the XFBML to render the button
        if (window.FB.XFBML) {
          console.log("[FacebookLoginButton] Rendering XFBML button");
          window.FB.XFBML.parse(containerRef.current);
        }
      }
    }, 100);

    return () => clearInterval(checkFBReady);
  }, []);

  const handleCheckLoginState = () => {
    if (!window.FB) {
      console.warn("[FacebookLoginButton] FB SDK not available");
      return;
    }

    console.log("[FacebookLoginButton] Checking login status...");
    window.FB.getLoginStatus((response: any) => {
      console.log("[FacebookLoginButton] Login status response:", response);
      if (response.status === "connected" && response.authResponse) {
        console.log("[FacebookLoginButton] User connected, calling handleFacebookLogin");
        handleFacebookLogin(response.authResponse);
      } else if (response.status === "not_authorized") {
        console.log("[FacebookLoginButton] User not authorized");
        toast({
          title: "Authorization Required",
          description: "Please authorize RemedyPills to access your Facebook profile.",
          variant: "default",
        });
      } else {
        console.log("[FacebookLoginButton] User not logged into Facebook");
      }
    });
  };

  const handleFacebookLogin = async (authResponse: any) => {
    try {
      console.log("[FacebookLoginButton] handleFacebookLogin called with authResponse:", {
        accessToken: authResponse.accessToken?.slice(0, 20) + "...",
        expiresIn: authResponse.expiresIn,
        userID: authResponse.userID,
      });

      // Get user details from Facebook
      window.FB.api(
        "/me",
        { fields: "id,name,email,picture" },
        async (me: any) => {
          console.log("[FacebookLoginButton] Facebook /me API response:", me);
          try {
            // Send to your backend to verify and create/update user
            console.log("[FacebookLoginButton] Calling /api/facebook-login...");
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

            console.log("[FacebookLoginButton] /api/facebook-login response status:", response.status);

            if (response.ok) {
              const user = await response.json();
              console.log("[FacebookLoginButton] Login successful, user:", user.id);
              // Refetch user data to update the auth context
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              onSuccess?.(user);
              // Redirect will happen automatically after auth context updates
              console.log("[FacebookLoginButton] Redirecting to /");
              window.location.href = "/";
            } else {
              const error = await response.text();
              console.error("[FacebookLoginButton] /api/facebook-login error:", error);
              toast({
                title: "Facebook Login Failed",
                description: error || "Unable to process your Facebook login. Please try again.",
                variant: "destructive",
              });
              onError?.(new Error(error || "Facebook login failed"));
            }
          } catch (error) {
            console.error("[FacebookLoginButton] Error in /api/facebook-login call:", error);
            const errorMessage = error instanceof Error ? error.message : "An error occurred";
            toast({
              title: "Facebook Login Error",
              description: errorMessage,
              variant: "destructive",
            });
            onError?.(error as Error);
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      console.error("[FacebookLoginButton] handleFacebookLogin outer catch:", error);
      toast({
        title: "Facebook Login Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(error as Error);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      {/* 
        The fb:login-button XFBML tag requires the Facebook SDK to parse it.
        The onlogin callback will be handled by our checkLoginState function.
        This is rendered via Facebook's XFBML parser, so not a standard React component.
      */}
      <div
        className="fb-login-button"
        data-width=""
        data-size="large"
        data-button-type="continue_with"
        data-layout="default"
        data-auto-logout-link="false"
        data-use-continue-as="false"
        data-scope={scope}
        onload={handleCheckLoginState}
      ></div>
    </div>
  );
}

// Alternative: Hook-based approach for manual login
export function useFacebookLogin() {
  const { toast } = useToast();

  const facebookLogin = (scope = "public_profile,email") => {
    if (!window.FB) {
      console.warn("[useFacebookLogin] FB SDK not available");
      toast({
        title: "Facebook SDK Not Ready",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log("[useFacebookLogin] Calling FB.login with scope:", scope);
    window.FB.login(
      (response: any) => {
        console.log("[useFacebookLogin] FB.login response:", { status: response.status });
        if (response.authResponse) {
          console.log("[useFacebookLogin] Auth success, calling handleFacebookAuthResponse");
          handleFacebookAuthResponse(response.authResponse);
        } else {
          console.log("[useFacebookLogin] Auth cancelled or failed");
          toast({
            title: "Facebook Login Cancelled",
            description: "You cancelled the Facebook login.",
            variant: "default",
          });
        }
      },
      { scope }
    );
  };

  const handleFacebookAuthResponse = async (authResponse: any) => {
    try {
      console.log("[useFacebookLogin] handleFacebookAuthResponse called");

      // Get user details from Facebook
      window.FB.api(
        "/me",
        { fields: "id,name,email,picture" },
        async (me: any) => {
          console.log("[useFacebookLogin] Facebook /me response:", me);
          try {
            // Send to your backend to verify and create/update user
            console.log("[useFacebookLogin] Calling /api/facebook-login...");
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

            console.log("[useFacebookLogin] /api/facebook-login status:", response.status);

            if (response.ok) {
              const user = await response.json();
              console.log("[useFacebookLogin] Login successful, user:", user.id);
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              console.log("[useFacebookLogin] Redirecting to /");
              window.location.href = "/";
            } else {
              const error = await response.text();
              console.error("[useFacebookLogin] /api/facebook-login error:", error);
              toast({
                title: "Facebook Login Failed",
                description: error || "Unable to process your Facebook login.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("[useFacebookLogin] Error in /api/facebook-login:", error);
            const errorMessage = error instanceof Error ? error.message : "An error occurred";
            toast({
              title: "Facebook Login Error",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      );
    } catch (error) {
      console.error("[useFacebookLogin] handleFacebookAuthResponse outer catch:", error);
      toast({
        title: "Facebook Login Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };
      );
    } catch (error) {
      console.error("Facebook login error:", error);
      toast({
        title: "Facebook Login Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return { facebookLogin };
}
