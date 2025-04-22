package com.gapShap.gapShap.service;

import com.gapShap.gapShap.model.User;
import com.gapShap.gapShap.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User saveOrUpdateUser(String authId, String name, String email, String pictureUrl) {
        Optional<User> existingUser = userRepository.findByAuthId(authId);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setName(name);
            user.setEmail(email);
            user.setPictureUrl(pictureUrl);
            return userRepository.save(user);
        } else {
            User newUser = new User(authId, name, email, pictureUrl);
            return userRepository.save(newUser);
        }
    }

    public Optional<User> findUserByAuthId(String authId) {
        return userRepository.findByAuthId(authId);
    }
}