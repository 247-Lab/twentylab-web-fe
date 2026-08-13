export const dynamic = 'force-dynamic';

export function GET() {
	return Response.json({ status: 'ok', service: 'twentylab-web-fe' }, { headers: { 'Cache-Control': 'no-store' } });
}
