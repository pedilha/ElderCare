package br.pucgo.ads.projetointegrador.plataforma.controller;

import br.pucgo.ads.projetointegrador.plataforma.dto.LoginRequestDTO;
import br.pucgo.ads.projetointegrador.plataforma.dto.LoginResponseDTO;
import br.pucgo.ads.projetointegrador.plataforma.entity.Usuario;
import br.pucgo.ads.projetointegrador.plataforma.repository.UsuarioRepository;
import br.pucgo.ads.projetointegrador.security.JwtProperties;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final JwtProperties jwtProperties;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        log.info("Tentativa de login com email {}", request.email());

        // 1) Busca o usuário pelo email
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário desativado");
        }

        // 2) Valida a senha com BCrypt
        if (usuario.getSenhaHash() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Senha não cadastrada. Recadastre o usuário definindo uma senha.");
        }
        if (!passwordEncoder.matches(request.senha(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas");
        }

        // 3) Gera o token JWT
        Algorithm alg = Algorithm.HMAC256(jwtProperties.getSecret());

        String token = JWT.create()
                .withIssuer(jwtProperties.getIssuer())
                // usamos o ID do usuário como "sub" (subject) do token
                .withSubject(String.valueOf(usuario.getId()))
                .sign(alg);

        // 4) Monta a resposta
        LoginResponseDTO response = new LoginResponseDTO(
                token,
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getTipoUsuario() != null ? usuario.getTipoUsuario().name() : null
        );

        return ResponseEntity.ok(response);
    }
}
