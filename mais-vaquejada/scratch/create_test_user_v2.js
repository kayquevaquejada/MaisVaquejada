
const supabaseUrl = "https://isioislkdfvjgrxwdrhf.supabase.co";
const supabaseKey = "sb_publishable__eB9Wz4DhP4yqRSIk5Iw4w_RGZkGtJM";

async function createUser() {
  const email = 'teste@maisvaquejada.com';
  const password = '12345678';

  console.log(`Tentando criar usuário: ${email}...`);

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          name: 'Teste Acesso'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro ao criar usuário:', data.msg || data.error_description || JSON.stringify(data));
      if (data.msg && data.msg.includes('already registered')) {
          console.log('Usuário já existe.');
      }
      return;
    }

    console.log('Usuário criado com sucesso!');
    console.log('ID:', data.id || data.user?.id);
    
    const userId = data.id || data.user?.id;

    if (userId) {
        console.log('Criando perfil na tabela public.profiles...');
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                id: userId,
                name: 'Teste Acesso',
                email: email,
                username: 'teste_acesso',
                profile_completed: true
            })
        });

        if (profileResponse.ok) {
            console.log('Perfil criado/atualizado com sucesso!');
        } else {
            const profileError = await profileResponse.json();
            console.error('Erro ao criar perfil:', JSON.stringify(profileError));
        }
    }

  } catch (err) {
    console.error('Erro na requisição:', err.message);
  }
}

createUser();
