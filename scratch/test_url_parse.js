try {
    const url = new URL('maisvaquejada://auth/callback?code=123');
    console.log('Scheme works:', url.searchParams.get('code'));
} catch (e) {
    console.log('Scheme fails:', e.message);
}
