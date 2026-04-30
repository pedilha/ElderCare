package br.pucgo.ads.projetointegrador.eldercare.service;

import br.pucgo.ads.projetointegrador.eldercare.domain.ex_pergunta;
import br.pucgo.ads.projetointegrador.eldercare.dto.CategoriaApiDTO;
import br.pucgo.ads.projetointegrador.eldercare.dto.OpcaoApiDTO;
import br.pucgo.ads.projetointegrador.eldercare.dto.PerguntaApiDTO;
import br.pucgo.ads.projetointegrador.eldercare.dto.QuestionarioApiResponse;
import br.pucgo.ads.projetointegrador.eldercare.repository.OpcaoPerguntaRepository;
import br.pucgo.ads.projetointegrador.eldercare.repository.PerguntaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class PerguntaService {

    /** Ordem e metadados das categorias — mantido aqui pois é info de apresentação */
    private static final String[][] CATEGORIA_ORDER = {
        {"condicao", "Condição física",          "🧩"},
        {"cardio",   "Saúde cardiovascular",     "💓"},
        {"forca",    "Força e equilíbrio",        "🏃"},
        {"flex",     "Flexibilidade",             "🧘"},
        {"habitos",  "Hábitos de vida",           "🍎"},
        {"mental",   "Saúde mental",              "🧠"},
        {"prefer",   "Objetivos",                 "🎯"},
        {"rotina",   "Rotina e disponibilidade",  "⏱"},
    };

    private final PerguntaRepository perguntaRepository;
    private final OpcaoPerguntaRepository opcaoPerguntaRepository;

    public PerguntaService(PerguntaRepository perguntaRepository,
                           OpcaoPerguntaRepository opcaoPerguntaRepository) {
        this.perguntaRepository = perguntaRepository;
        this.opcaoPerguntaRepository = opcaoPerguntaRepository;
    }

    /**
     * Retorna todas as perguntas agrupadas por categoria, na ordem correta.
     */
    public QuestionarioApiResponse listarCategorias() {
        List<ex_pergunta> todasPerguntas = perguntaRepository.findAllBySlugIsNotNullOrderByOrdem();

        // Agrupa por categoria preservando a ordem definida em CATEGORIA_ORDER
        Map<String, List<ex_pergunta>> porCategoria = new LinkedHashMap<>();
        for (String[] cat : CATEGORIA_ORDER) {
            porCategoria.put(cat[0], new ArrayList<>());
        }
        for (ex_pergunta p : todasPerguntas) {
            if (p.getCategoria() != null) {
                porCategoria.computeIfAbsent(p.getCategoria(), k -> new ArrayList<>()).add(p);
            }
        }

        // Monta as DTOs de categorias
        List<CategoriaApiDTO> categorias = new ArrayList<>();
        for (String[] catMeta : CATEGORIA_ORDER) {
            String catId     = catMeta[0];
            String catTitulo = catMeta[1];
            String catEmoji  = catMeta[2];

            List<ex_pergunta> catPerguntas = porCategoria.getOrDefault(catId, List.of());
            if (catPerguntas.isEmpty()) continue;

            List<PerguntaApiDTO> perguntaDtos = catPerguntas.stream()
                    .map(p -> {
                        List<OpcaoApiDTO> opcoes = opcaoPerguntaRepository
                                .findByPergunta_IdOrderByOrdemAsc(p.getId())
                                .stream()
                                .map(o -> new OpcaoApiDTO(o.getCodigo(), o.getRotulo()))
                                .toList();
                        return new PerguntaApiDTO(
                                p.getId().toString(),
                                p.getSlug(),
                                p.getEnunciado(),
                                p.getTipo(),
                                p.getOrdem(),
                                opcoes
                        );
                    })
                    .toList();

            categorias.add(new CategoriaApiDTO(catId, catTitulo, catEmoji, perguntaDtos));
        }

        return new QuestionarioApiResponse(categorias);
    }
}
