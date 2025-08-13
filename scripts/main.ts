import { Container, EntityEquippableComponent, EquipmentSlot, Player, system, world } from "@minecraft/server";

const isSyncing = new Set<string>();

function update(container: Container, equippable: EntityEquippableComponent, except: Player[] = []) {
    const players = world.getPlayers({
        excludeNames: [ ...except.map(p => p.name) ]
    });

    for (const player of players) {
        applyInv(player, container, equippable);
    }
}

function applyInv(target: Player, container: Container, equippable: EntityEquippableComponent) {
    const playerContainer = target.getComponent('inventory')!.container;
    const playerEquippable = target.getComponent('equippable')!;
    
    for (let index = 0; index < container.size; index++) {
        playerContainer.setItem(index, container.getItem(index));
    }

    const equipmentSlots = Object.values(EquipmentSlot);
    for (const slot of equipmentSlots) {
        if (slot === EquipmentSlot.Mainhand) continue;
        playerEquippable.setEquipment(slot, equippable.getEquipment(slot));
    }
}


world.afterEvents.playerInventoryItemChange.subscribe(ev => {
    const {player} = ev;

    if (isSyncing.has(player.id)) return;
    
    const playerContainer = player.getComponent('inventory')!.container;
    const playerEquippable = player.getComponent('equippable')!;
    update(playerContainer, playerEquippable, [player]);
});

world.afterEvents.playerJoin.subscribe(ev => {
    isSyncing.add(ev.playerId);
});

world.afterEvents.playerSpawn.subscribe(ev => {
    if (ev.initialSpawn) {
        const player = ev.player;
        const referencePlayer = world.getPlayers({excludeNames: [player.name]})[0];

        if (referencePlayer) {
            const referenceContainer = referencePlayer.getComponent('inventory')!.container;
            const referenceEquippable = referencePlayer.getComponent('equippable')!;

            applyInv(player, referenceContainer, referenceEquippable);
        }
        isSyncing.delete(player.id);
    }
});