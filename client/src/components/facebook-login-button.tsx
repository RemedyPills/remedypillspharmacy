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
    // Wait for Facebook SDK to load
    const checkFBReady = setInterval(() => {
      if (window.FB) {
        clearInterval(checkFBReady);
        // Parse the XFBML to render the button
        if (window.FB.XFBML) {
          window.FB.XFBML.parse(containerRef.current);
        }
      }
    }, 100);

    return () => clearInterval(checkFBReady);
  }, []);

  const handleCheckLoginState = () => {
    if (!window.FB) return;

    window.FB.getLoginStatus((response: any) => {
      if (response.status === "connected" && response.authResponse) {
        handleFacebookLogin(response.authResponse);
      } else if (response.status === "not_authorized") {
        toast({
          title: "Authorization Required",
          description: "Please authorize RemedyPills to access your Facebook profile.",
          variant: "default",
        });
      }
    });
  };

  const handleFacebookLogin = async (authResponse: any) => {
    try {
      // Get user details from Facebook
      window.FB.api(
        "/me",
        { fields: "id,name,email,picture" },
        async (me: any) => {
          try {
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
              // Refetch user data to update the auth context
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              onSuccess?.(user);
              // Redirect will happen automatically after auth context updates
              window.location.href = "/";
            } else {
              const error = await response.text();
              toast({
                title: "Facebook Login Failed",
                description: error || "Unable to process your Facebook login. Please try again.",
                variant: "destructive",
              });
              onError?.(new Error(error || "Facebook login failed"));
            }
          } catch (error) {
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
      console.error("Facebook login error:", error);
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
      toast({
        title: "Facebook SDK Not Ready",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          handleFacebookAuthResponse(response.authResponse);
        } else {
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
      // Get user details from Facebook
      window.FB.api(
        "/me",
        { fields: "id,name,email,picture" },
        async (me: any) => {
          try {
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
              await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              window.location.href = "/";
            } else {
              const error = await response.text();
              toast({
                title: "Facebook Login Failed",
                description: error || "Unable to process your Facebook login.",
                variant: "destructive",
              });
            }
          } catch (error) {
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
