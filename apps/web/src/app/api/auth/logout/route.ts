
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete('auth0_session');

  return NextResponse.json({
    success: true,
    message: 'Successfully logged out.',
  });
}
