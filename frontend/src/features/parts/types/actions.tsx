'use server';

import { revalidatePath } from 'next/cache';

interface CreatePartsRequestInput {
  jobId: string;
  description: string;
  quantity: number;
}

export async function createPartsRequestDraftAction(payload: CreatePartsRequestInput) {
  try {
   
    const session = { token: 'your-auth-token' }; 
    const { jobId, description, quantity } = payload;

    const backendUrl = (globalThis as any).process?.env?.NEXT_PUBLIC_BACKEND_URL;
    const response = await fetch(`${backendUrl}/api/parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        jobId,        
        description,   
        quantity,
      }),
    });

    if (!response.ok) {
      throw new Error('Backend failed to process draft record.');
    }

    const result = await response.json();
    revalidatePath('/dashboard/parts');

    return {
      success: true,
      data: { id: result.data?.id || result.id },
    };
  } catch (error) {
    console.error('Error creating parts request draft:', error);
    return {
      success: false,
      message: 'Failed to record parts request draft securely.',
    };
  }
}
