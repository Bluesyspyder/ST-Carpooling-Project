export function getBadge(credits:number){

    if(credits>=1000)
        return "Eco Legend";

    if(credits>=600)
        return "Climate Hero";

    if(credits>=300)
        return "Green Champion";

    if(credits>=100)
        return "Eco Rider";

    return "Beginner";
}