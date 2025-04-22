package com.gapShap.gapShap.repository;

import com.gapShap.gapShap.model.Conversation;
import com.gapShap.gapShap.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    
    List<Message> findByConversationOrderBySentAtAsc(Conversation conversation, Pageable pageable);
    List<Message> findByConversationOrderBySentAtDesc(Conversation conversation, Pageable pageable);
    
    List<Message> findByConversationAndIsReadFalseOrderBySentAtDesc(Conversation conversation);
    
    long countByConversationAndIsReadFalse(Conversation conversation);
}