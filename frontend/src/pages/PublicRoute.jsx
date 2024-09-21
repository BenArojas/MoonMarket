// PublicRoute.jsx
import { Outlet } from 'react-router-dom';
import { requireAnonymous} from '@/utils/auth'

export async function loader () {
  await requireAnonymous();
  return null;
}
export const PublicRoute = () => {

  return <Outlet />;
};
