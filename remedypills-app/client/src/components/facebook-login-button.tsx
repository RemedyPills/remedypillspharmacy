import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

declare global {
  interface Window {
    FB: any;
  }
}

interface FacebookLoginButtonProps {
  scope?: string;
  className?: string;
}

/**
 * Renders the Facebook XFBML login button.
 * Uses event subscription to detect login success and then calls our hook flow.
 */
export function FacebookLoginButton({
  scope = "public_profile,email",
  className = "h-12 w-full",
}: FacebookLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { facebookLogin } = useFacebookLogin();

  // Parse XFBML once the SDK is ready, and subscribe to auth changes.
  useEffect(() => {
    let interval: number | undefined;
    let subscribed = false;

    const tryInit = () => {
      if (!window.FB) return;

      // Render the XFBML button inside our container
      if (window.FB.XFBML && containerRef.current) {
        window.FB.XFBML.parse(containerRef.current);
      }

      // Subscribe to login events so clicking the XFBML button triggers our flow
      if (!subscribed && window.FB.Event && window.FB.Event.subscribe) {
        subscribed = true;

        window.FB.Event.subscribe("auth.statusChange", (response: any) => {
          // When status becomes connected, run our login flow
          if (response?.status === "connected") {
            facebookLogin(scope);
          }
        });
      }
    };

    // Poll until SDK is available
    interval = window.setInterval(() => {
      if (window.FB) {
        window.clearInterval(interval);
        tryInit();
      }
    }, 100);

    return () => {
      if (interval) window.clearInterval(interval);

      // Best-effort unsubscribe
      try {
        if (subscribed && window.FB?.Event?.unsubscribe) {
          window.FB.Event.unsubscribe("auth.statusChange");
        }
      } catch {
        // ignore
      }
    };
  }, [facebookLogin, scope]);

  return (
    <div ref={containerRef} className={className}>
      {/* Facebook renders this via XFBML parse */}
      <div
        className="fb-login-button"
        data-width=""
        data-size="large"
        data-button-type="continue_with"
        data-layout="default"
        data-auto-logout-link="false"
        data-use-continue-as="false"
        data-scope={scope}
      ></div>
    </div>
  );
}

export function useFacebookLogin() {
  const { toast } = useToast();

  const handleFacebookAuthResponse = useCallback(
    async (authResponse: any) => {
      try {
        // Get user details from Facebook
        window.FB.api(
          "/me",
          { fields: "id,name,email,picture" },
          async (me: any) => {
            try {
              const response = await fetch("/api/facebook-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                return;
              }

              const errorText = await response.text();
              toast({
                title: "Facebook Login Failed",
                description: errorText || "Unable to process your Facebook login.",
                variant: "destructive",
              });
            } catch (error) {
              toast({
                title: "Facebook Login Error",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
              });
            }
          }
        );
      } catch (error) {
        toast({
          title: "Facebook Login Error",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const facebookLogin = useCallback(
    (scope = "public_profile,email") => {
      if (!window.FB) {
        console.warn("[useFacebookLogin] FB SDK not available");
        toast({
          title: "Facebook SDK Not Ready",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      window.FB.login(
        (response: any) => {
          if (response?.authResponse) {
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
    },
    [handleFacebookAuthResponse, toast]
  );

  return { facebookLogin };
}