import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/', 
  '/explore', 
  '/login(.*)', 
  '/register(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/webhooks/dodo(.*)',
  '/api/health',
  '/maintenance'
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // In Clerk v7, protect() lives on the auth function itself.
    // It checks authentication AND returns the signed-in auth object.
    //
    // `unauthenticatedUrl` is required here, not optional. Without it,
    // protect() only redirects when it can positively identify a *document*
    // request. A server action POST fails that sniff and falls through to
    // either unauthorized() (401) or, when the `next-url` header is absent,
    // notFound() (404). Either way the Next client gets an HTML error page
    // where it expected an RSC flight payload, and fetchServerAction throws
    // "An unexpected response was received from the server". Passing the URL
    // takes protect()'s first branch, so an expired session redirects cleanly
    // for every request type instead of depending on header detection.
    const signInUrl = new URL('/login', request.url);
    signInUrl.searchParams.set(
      'redirect_url',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    const authObj = await auth.protect({ unauthenticatedUrl: signInUrl.toString() });

    // Role-based protection for admin routes
    if (isAdminRoute(request)) {
      const role = (authObj.sessionClaims?.metadata as { role?: string })?.role ||
                   (authObj.sessionClaims?.publicMetadata as { role?: string })?.role;
      if (role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  return NextResponse.next();
});


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
