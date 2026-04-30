package br.pucgo.ads.projetointegrador.eldercare.controller;

import br.pucgo.ads.projetointegrador.eldercare.dto.PlanoGeradoResponse;
import br.pucgo.ads.projetointegrador.eldercare.dto.QuestionarioApiResponse;
import br.pucgo.ads.projetointegrador.eldercare.service.PerguntaService;
import br.pucgo.ads.projetointegrador.eldercare.service.QuestionarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/eldercare/questionario")
public class QuestionarioController {

    private final QuestionarioService questionarioService;
    private final PerguntaService perguntaService;

    public QuestionarioController(QuestionarioService questionarioService,
                                  PerguntaService perguntaService) {
        this.questionarioService = questionarioService;
        this.perguntaService = perguntaService;
    }

    /**
     * GET /api/eldercare/questionario/perguntas
     * Retorna todas as perguntas agrupadas por categoria.
     */
    @GetMapping("/perguntas")
    public ResponseEntity<QuestionarioApiResponse> listarPerguntas() {
        return ResponseEntity.ok(perguntaService.listarCategorias());
    }

    /**
     * Endpoint usado pelo FRONT:
     * POST /api/eldercare/questionario/gerar
     * Corpo: { "idosoId": 1, "respostas": [...] }
     */
    @PostMapping("/gerar")
    public ResponseEntity<PlanoGeradoResponse> gerarPlanoCompat(@RequestBody Map<String, Object> payload) {
        PlanoGeradoResponse dto = questionarioService.gerarPlanoCompat(payload);
        return ResponseEntity.ok(dto);
    }

    /**
     * Endpoint opcional para testes via Postman:
     * GET /api/eldercare/questionario/testar/{respostaId}
     * Gera o plano a partir do ID de uma resposta já existente.
     */
    @GetMapping("/testar/{respostaId}")
    public ResponseEntity<PlanoGeradoResponse> gerarPlanoPorResposta(@PathVariable UUID respostaId) {
        PlanoGeradoResponse dto = questionarioService.gerarPlanoPorResposta(respostaId);
        return ResponseEntity.ok(dto);
    }
}
