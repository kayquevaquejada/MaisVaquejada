
const supabaseUrl = "https://isioislkdfvjgrxwdrhf.supabase.co";
const supabaseKey = "sb_publishable__eB9Wz4DhP4yqRSIk5Iw4w_RGZkGtJM";

async function createUser() {
  const email = 'teste@maisvaquejada.com';
  const password = '12345678';

  console.log(`Tentando criar usuário no projeto NOVO: ${email}...`);

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
        console.error('Erro ao criar usuário:', JSON.stringify(data));
        return;
    }

    console.log('Usuário criado com sucesso no projeto novo!');
  } catch (err) {
    console.error('Erro na requisição:', err.message);
  }
}

createUser();
