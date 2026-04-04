package com.appifylab.social.repository;

import com.appifylab.social.entity.Reaction;
import com.appifylab.social.entity.ReactionTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {
    Optional<Reaction> findByUserIdAndTargetTypeAndTargetId(Long userId, ReactionTargetType targetType, Long targetId);

    List<Reaction> findAllByTargetTypeAndTargetIdIn(ReactionTargetType targetType, Collection<Long> targetIds);

    List<Reaction> findAllByTargetTypeAndTargetIdOrderByCreatedAtDesc(ReactionTargetType targetType, Long targetId);
}

