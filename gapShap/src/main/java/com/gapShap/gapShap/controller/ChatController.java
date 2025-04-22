package com.gapShap.gapShap.controller;

import com.gapShap.gapShap.dto.ConversationDTO;
import com.gapShap.gapShap.dto.MessageDTO;
import com.gapShap.gapShap.model.User;
import com.gapShap.gapShap.service.ChatService;
import com.gapShap.gapShap.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;

    @Autowired
    public ChatController(ChatService chatService, UserService userService) {
        this.chatService = chatService;
        this.userService = userService;
    }
    
    // REST endpoints for conversation management
    
    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(@AuthenticationPrincipal OidcUser principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        User currentUser = userService.findUserByAuthId(principal.getSubject())
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        List<ConversationDTO> conversations = chatService.getConversationsForUser(currentUser);
        return ResponseEntity.ok(conversations);
    }
    
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<?> getMessages(
            @AuthenticationPrincipal OidcUser principal,
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        User currentUser = userService.findUserByAuthId(principal.getSubject())
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        try {
            List<MessageDTO> messages = chatService.getMessagesForConversation(conversationId, currentUser, page, size);
            return ResponseEntity.ok(messages);
        } catch (IllegalArgumentException | NoSuchElementException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/conversations/direct/{userId}")
    public ResponseEntity<?> createDirectConversation(
            @AuthenticationPrincipal OidcUser principal,
            @PathVariable Long userId) {
        
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        User currentUser = userService.findUserByAuthId(principal.getSubject())
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        User otherUser = userService.findUserById(userId)
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        try {
            ConversationDTO conversation = chatService.getOrCreateDirectConversation(currentUser, otherUser);
            return ResponseEntity.ok(conversation);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/conversations/group")
    public ResponseEntity<?> createGroupConversation(
            @AuthenticationPrincipal OidcUser principal,
            @RequestBody Map<String, Object> request) {
        
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        User currentUser = userService.findUserByAuthId(principal.getSubject())
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        String name = (String) request.get("name");
        List<Long> participantIds = (List<Long>) request.get("participantIds");
        
        if (name == null || participantIds == null) {
            return ResponseEntity.badRequest().body("Name and participant IDs are required");
        }
        
        try {
            List<User> participants = userService.findUsersByIds(participantIds);
            
            // Add current user to participants if not already included
            if (!participantIds.contains(currentUser.getId())) {
                participants.add(currentUser);
            }
            
            ConversationDTO conversation = chatService.createGroupConversation(name, participants);
            return ResponseEntity.ok(conversation);
        } catch (IllegalArgumentException | NoSuchElementException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<?> markMessagesAsRead(
            @AuthenticationPrincipal OidcUser principal,
            @PathVariable Long conversationId) {
        
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        
        User currentUser = userService.findUserByAuthId(principal.getSubject())
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        try {
            chatService.markMessagesAsRead(currentUser, conversationId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException | NoSuchElementException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    // WebSocket message handling
    
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, Object> messageRequest, Principal principal) {
        String authId = principal.getName();
        User sender = userService.findUserByAuthId(authId)
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        Long conversationId = Long.valueOf(messageRequest.get("conversationId").toString());
        String content = (String) messageRequest.get("content");
        
        chatService.sendMessage(sender, conversationId, content);
    }
    
    @MessageMapping("/chat.markRead")
    public void markRead(@Payload Map<String, Object> readRequest, Principal principal) {
        String authId = principal.getName();
        User user = userService.findUserByAuthId(authId)
            .orElseThrow(() -> new NoSuchElementException("User not found"));
        
        Long conversationId = Long.valueOf(readRequest.get("conversationId").toString());
        chatService.markMessagesAsRead(user, conversationId);
    }
}