import { requireActiveSession, requireRole } from '@/auth/dal';
import { Modal } from '../../_components/Modal';
import { NewCategoryClient } from '../../_components/NewCategoryClient';

export default async function NewCategoryIntercept() {
  await requireActiveSession();
  await requireRole('admin');

  return (
    <Modal>
      <NewCategoryClient />
    </Modal>
  );
}
