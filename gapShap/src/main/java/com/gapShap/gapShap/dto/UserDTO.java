package com.gapShap.gapShap.dto;

public class UserDTO {
    
    private Long id;
    private String name;
    private String email;
    private String pictureUrl;
    
    // Default constructor
    public UserDTO() {}
    
    // Constructor with fields
    public UserDTO(Long id, String name, String email, String pictureUrl) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.pictureUrl = pictureUrl;
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPictureUrl() {
        return pictureUrl;
    }
    
    public void setPictureUrl(String pictureUrl) {
        this.pictureUrl = pictureUrl;
    }
}