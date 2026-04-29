import { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { setAuthToken } from '@/lib/http';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
      });
      if (!res.ok) throw new Error('Credenciais inválidas');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      setAuthToken(data.token);
      enqueueSnackbar('Login realizado com sucesso!', { variant: 'success' });
      navigate('/home', { replace: true });
    } catch (err) {
      enqueueSnackbar('Falha ao autenticar. Verifique e-mail e senha.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Card sx={{ width: '100%', maxWidth: 420, mx: 'auto' }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h3" component="h1" gutterBottom>
              Entrar
            </Typography>
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

