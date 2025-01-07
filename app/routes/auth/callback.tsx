import { useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { supabase } from '~/lib/supabase';
import { toast } from 'react-toastify';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Processa o callback do OAuth
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast.success('Logged in successfully!');
        navigate('/'); // Redireciona para a página inicial
      }
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 i-ph:circle-notch-thin text-bolt-elements-textPrimary" />
    </div>
  );
}
