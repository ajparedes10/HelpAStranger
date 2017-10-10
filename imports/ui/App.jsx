import React, {Component} from "react";
import PropTypes from "prop-types";
import {createContainer} from "meteor/react-meteor-data";

import Navigation from "./Navigation.jsx";
import Footer from "./Footer.jsx";
import Menu from "./Menu.jsx";
import PostViewer from "./PostViewer.jsx";
import Chat from "./Chat.jsx";

import {Posts} from "../api/Posts.js";
import {Chatrooms} from "../api/Chatrooms.js";
import {Anons} from "../api/Anons.js";
import {UserInfo} from "../api/UserInfo.js";


import "./App.css";

class App extends Component {
    constructor(props){
        super(props);
        this.state = {
            currentUser : null,
            currentChat : null,
        }
    }

    componentWillUpdate(newProps){
        if (!this.state.currentUser && newProps.user) {
            this.onUserEnter(newProps.user.username)
        } 
        if (this.state.currentUser && newProps.user) {
            
        }
        if (this.state.currentUser && newProps.user === null) {
            this.setState({
                currentUser : null
            });
        }
    }

    // el parametro no es usado dentro del método
    onUserEnter(){
        //usar let o const en lugar de var
        const yo = this;
        Tracker.autorun (function() {
            const userID = Meteor.user()._id;
            Meteor.call("user.find", userID, (error, result) => {
                // en ente caso == podria causar resultados extraños, es mejor usar ===
                if (result === undefined) {
                    Meteor.call("user.create", userID,  function (error2, result2) {
                        yo.setState({
                            currentUser : result2
                        });
                    });
                } else {
                    yo.setState({
                        currentUser : result
                    });
                }
            });
        }); 
    }

    increaseFeel(feel, post){
        if(feel == "animo"){
            Meteor.call("posts.animo", post);
        } else if(feel == "nogive") {
            Meteor.call("posts.noGive", post);
        } else if(feel == "better"){
            Meteor.call("posts.better", post);
        }
    }

    sendMessage(text) {
        let author = this.state.currentUser.anon;
        let newMessage = {
            text: text,
            author: author,
            date: (new Date()).toDateString() + " " + (new Date()).toLocaleTimeString() 
        }; // falta ;
        Meteor.call("chats.send", newMessage, this.state.currentChat, (error, result) => {
            this.setState({
                currentChat: result
            });
        });
    }

    newPost(text){
        let words = text.toLowerCase()
            .replace(/\slos\s/g, " ").replace(/\slas\s/g, " ").replace(/\sy\s/g, " ")
            .replace(/\sun\s/g, " ").replace(/\sa\s/g, " ").replace(/\sla\s/g, " ")
            .replace(/\slos\s/g, " ").replace(/\spor\s/g, " ").replace(/\sde\s/g, " ")
            .replace(/,/g, " ").replace(/\smi\s/g, " ")
            .replace(/\sme\s/g, " ").replace(/\smuy\s/g, " ").replace(/\ssoy\s/g, " ")
            .replace(/;/g, " ").replace(/:/g, " ").replace(/!/g, " ")
            .replace(/¿/g, " ").replace(/¡/g, " ").replace(/\scon\s/g, " ")
            .replace(/\sno\s/g, " ").replace(/\ssi\s/g, " ").split(/\s+/);

            //usar let o const en lugar de var
            let wordsMap = {};
            words.forEach(function (key) {
              if (wordsMap.hasOwnProperty(key)) {
                wordsMap[key]++;
              } else {
                wordsMap[key] = 1;
              }
            });
    
            let finalWordsArray = [];
            finalWordsArray = Object.keys(wordsMap).map(function (key) {
              return {
                name: key,
                total: wordsMap[key]
              };
            });
          
            finalWordsArray.sort(function (a, b) {
              return b.total - a.total;
            });

            keywords = finalWordsArray.map((word) => {
                return word.name;
            });



        let newPost = {
            text : text,
            author : this.state.currentUser.anon,
            date : (new Date()).toDateString() + " " + (new Date()).toLocaleTimeString(),
            animos : 0,
            nogive : 0,
            better : 0,
            keywords : keywords.slice(0,3)
        };
        Tracker.autorun (() => {
            Meteor.call('posts.insert', newPost, (error, result) => {
                let chat = {
                    keywords : newPost.keywords,
                    participants : [],
                    messages : [] 
                };
                Meteor.call("chats.createchat", chat, (error3, result3) => {
                    Meteor.call("chats.addme", this.state.currentUser, result3, (error2, result2) => {
                        this.setState({
                            currentChat : result2
                        });
                        
                    });
                });
            });
        });
    }

    selectChat(chat){
        this.setState({
            currentChat : chat
        });
    }

    render(){
        return (
            <div  className="app">
                <Navigation user={this.state.currentUser}/>
                
                <div className="container-fluid">
                    <div className="row">
                        {this.state.currentUser ? 
                                <Menu info={this.state.currentUser} change={this.selectChat.bind(this)}/>
                                : <div>Por favor inicia sesión</div>
                            }
                        
                        <PostViewer posts={this.props.posts} vote={this.increaseFeel.bind(this)}
                            addpost={this.newPost.bind(this)}/>
                        {this.state.currentChat ? 
                            <Chat currentUser={this.state.currentUser} chat={this.props.chats.find((current) => {
                                            return current._id == this.state.currentChat._id })}
                                             newMessage={this.sendMessage.bind(this)}/>
                            : <div></div>
                        }
                    </div>
                </div>
                <Footer help = {1000000} rooms = {this.props.chats.length}
                    posted = {this.props.posts.length} />
            </div>)
    }
}

App.propTypes = {
    posts : PropTypes.array.isRequired,
    user : PropTypes.object,
    chats : PropTypes.array.isRequired
};

export default createContainer(()=>{

    Meteor.subscribe("posts");
    Meteor.subscribe("anons");
    Meteor.subscribe("chats");

    return { posts : Posts.find({}, { sort: { date: -1 } }).fetch(),
             user : Meteor.user(),
             chats : Chatrooms.find({}).fetch(),

    };
}, App);
