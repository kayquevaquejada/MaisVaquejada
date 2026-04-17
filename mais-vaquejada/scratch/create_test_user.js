
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = "https://isioislkdfvjgrxwdrhf.supabase.co";
const supabaseKey = "sb_publishable__eB9Wz4DhP4yqRSIk5Iw4w_RGZkGtJM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
  const email = 'teste@maisvaquejada.com';
  const password = '12345678';

  console.log(`Tentando criar usuário: ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Teste Acesso',
        full_name: 'Teste Acesso',
      }
    }
  });

  if (error) {
    console.error('Erro ao criar usuário:', error.message);
    if (error.message.includes('already registered')) {
        console.log('Usuário já existe. Tentando login para confirmar...');
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
            console.error('Senha incorreta ou erro no login:', loginError.message);
        } else {
            console.log('Login realizado com sucesso! O usuário já estava ativo.');
        }
    }
  } else {
    console.log('Usuário criado com sucesso!');
    console.log('ID:', data.user?.id);
    
    if (data.session) {
        console.log('Sessão iniciada (Email marketing/confirmado desativado).');
    } else {
        console.log('Aguardando confirmação de e-mail (se estiver ativado no Supabase).');
    }

    // Criar perfil manualmente se necessário
    if (data.user) {
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                name: 'Teste Acesso',
                email: email,
                username: 'teste_acesso',
                profile_completed: true
            });
            
        if (profileError) {
            console.error('Erro ao criar perfil:', profileError.message);
        } else {
            console.log('Perfil criado/atualizado com sucesso!');
        }
    }
  }
}

createUser();
