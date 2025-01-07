import { useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { supabase } from '~/lib/supabase';
import { toast } from 'react-toastify';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Obtém o hash da URL
        const hash = window.location.hash;
        if (!hash) return;

        // Processa o callback do OAuth
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session) {
          toast.success('Logged in successfully!');
          navigate('/');
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Failed to sign in');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1A1B1E]">
      <div className="animate-spin h-8 w-8 i-ph:circle-notch-thin text-white/80" />
    </div>
  );
}
