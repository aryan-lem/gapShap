package com.gapShap.gapShap.repository;

import com.gapShap.gapShap.model.Conversation;
import com.gapShap.gapShap.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    
    @Query("SELECT c FROM Conversation c JOIN c.participants p1 JOIN c.participants p2 " +
           "WHERE c.isGroupChat = false AND p1 = :user1 AND p2 = :user2")
    Optional<Conversation> findDirectConversation(@Param("user1") User user1, @Param("user2") User user2);
    
    @Query("SELECT c FROM Conversation c JOIN c.participants p WHERE p = :user")
    List<Conversation> findConversationsForUser(@Param("user") User user);
}