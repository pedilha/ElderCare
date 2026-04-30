package br.pucgo.ads.projetointegrador.eldercare.repository;

import br.pucgo.ads.projetointegrador.eldercare.domain.ex_pergunta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PerguntaRepository extends JpaRepository<ex_pergunta, UUID> {

    Optional<ex_pergunta> findBySlug(String slug);

    List<ex_pergunta> findAllBySlugIsNotNullOrderByOrdem();

    long countBySlugIsNotNull();
}
