module.exports = function (maxGroupSize, maxQueuingTime, groupingFunction) {

    this.queue = [];
    let newGroupCallback;
    let pipeIsWaiting = false;
    let waitingIntervalId;

    let startWaitingMessages = () => {
        if(pipeIsWaiting === false){
            pipeIsWaiting = true;
            waitingIntervalId = setInterval(async()=>{
                if (this.queue.length > 0) {
                    await checkPipeMessages(true);
                }
            }, maxQueuingTime);
        }
    }

    let stopWaitingMessages = () =>{
        pipeIsWaiting = false;
        if(waitingIntervalId){
            clearInterval(waitingIntervalId);
        }
    }

    this.addInQueue =  async (messages) => {

        if (!Array.isArray(messages)) {
            messages = [messages]
        }

        for (let i = 0; i < messages.length; i++) {
            this.queue.push(messages[i]);
        }

        await checkPipeMessages();

    }

    this.onNewGroup = (__newGroupCallback) => {
         newGroupCallback = __newGroupCallback;
    };

    let checkPipeMessages = async (forceFlush) =>{

        let messageGroup = await $$.promisify(groupingFunction)(this.queue);

        if (messageGroup.length < this.queue.length || maxGroupSize <= this.queue.length || forceFlush) {
            messageGroup = [...messageGroup];
            this.queue.splice(0,messageGroup.length);
            stopWaitingMessages();
            newGroupCallback(messageGroup);
        }
        startWaitingMessages();
    }

    startWaitingMessages();

}