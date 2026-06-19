// 'use server';

// import { db } from '@/db';
// import { partsRequests } from '@/db/schema';
// import { requireAuth } from '@/server/auth';
// import { revalidatePath } from 'next/cache';  The database import are problematic as i dont understand help on this will be greatly appreciated 
// import { createPartsRequestDraftSchema } from './schemas';

export async function createPartsRequestDraftAction(rawInput: unknown) {
  const session = await requireAuth();

  // Validate input using schema
  const validationResult = createPartsRequestDraftSchema.safeParse(rawInput);
  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { partNumber, description, quantity } = validationResult.data;

  try {
    // Insert new parts request draft
    const [newDraft] = await db
      .insert(partsRequests)
      .values({
        tenantId: session.tenantId,
        partNumber,
        description,
        quantity,
        status: 'draft', // Ensures deterministic union compliance
      })
      .returning();

    revalidatePath('/dashboard/parts');
    
    return {
      success: true,
      data: { id: newDraft.id },
    };
  } catch (error) {
    console.error('Error creating parts request draft:', error);
    return {
      success: false,
      message: 'Failed to record parts request draft securely.',
    };
  }
}
