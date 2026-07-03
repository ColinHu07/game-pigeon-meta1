import type { Ball, BallGroup, PlayerId, RulesContext, RulesResult, ShotOutcome } from '../types';

const opponentOf = (player: PlayerId): PlayerId => (player === 'human' ? 'bot' : 'human');

export function groupCleared(balls: Ball[], group: BallGroup): boolean {
  return balls.every((ball) => ball.kind !== group || ball.pocketed);
}

export function legalTargetKind(context: RulesContext): Ball['kind'] {
  const player = context.players[context.currentPlayer];
  if (!player.group) return 'solids';
  return groupCleared(context.ballsBefore, player.group) ? 'eight' : player.group;
}

function firstPottedGroup(context: RulesContext, outcome: ShotOutcome): BallGroup | undefined {
  for (const id of outcome.potted) {
    const ball = context.ballsAfter.find((candidate) => candidate.id === id);
    if (ball?.kind === 'solids' || ball?.kind === 'stripes') return ball.kind;
  }
  return undefined;
}

function pottedOwnGroup(context: RulesContext, outcome: ShotOutcome, group?: BallGroup): boolean {
  if (!group) return false;
  return outcome.potted.some((id) => {
    const ball = context.ballsAfter.find((candidate) => candidate.id === id);
    return ball?.kind === group;
  });
}

function isFirstContactLegal(context: RulesContext, firstContact?: Ball): boolean {
  if (!firstContact) return false;
  const player = context.players[context.currentPlayer];

  if (!player.group) {
    return firstContact.kind === 'solids' || firstContact.kind === 'stripes';
  }

  const target = legalTargetKind(context);
  return firstContact.kind === target;
}

export function resolveShot(context: RulesContext, outcome: ShotOutcome): RulesResult {
  const current = context.currentPlayer;
  const opponent = opponentOf(current);
  const players = {
    human: { ...context.players.human },
    bot: { ...context.players.bot },
  };
  const firstContact = context.ballsBefore.find((ball) => ball.id === outcome.firstContactId);
  const eightPotted = outcome.potted.includes(8);
  const contactLegal = isFirstContactLegal(context, firstContact);
  const scratch = outcome.cuePocketed;
  let foul = scratch || !contactLegal;
  let winner: PlayerId | undefined;
  let message = '';

  if (!players[current].group && !foul) {
    const assigned = firstPottedGroup(context, outcome);
    if (assigned) {
      players[current].group = assigned;
      players[opponent].group = assigned === 'solids' ? 'stripes' : 'solids';
      message = `${players[current].name} claimed ${assigned}.`;
    }
  }

  const currentGroup = players[current].group;
  const clearedBefore = currentGroup ? groupCleared(context.ballsBefore, currentGroup) : false;

  if (eightPotted) {
    const legalEight = currentGroup && clearedBefore && contactLegal && !scratch;
    winner = legalEight ? current : opponent;
    foul = !legalEight;
    message = legalEight
      ? `${players[current].name} sank the 8.`
      : `${players[current].name} lost by sinking the 8 early.`;
  } else if (scratch) {
    message = `${players[current].name} scratched. Ball in hand.`;
  } else if (!contactLegal) {
    message = firstContact
      ? `${players[current].name} hit the wrong ball first.`
      : `${players[current].name} missed every ball.`;
  } else if (!message) {
    const potted = outcome.potted.filter((id) => id !== 0);
    message = potted.length > 0 ? `${players[current].name} pocketed ${potted.length}.` : 'No balls dropped.';
  }

  const ownsPottedBall = pottedOwnGroup(context, outcome, players[current].group);
  const keepsTurn = !foul && !winner && ownsPottedBall;
  const nextPlayer = keepsTurn ? current : opponent;

  return {
    nextPlayer,
    players,
    foul,
    ballInHand: foul && !winner,
    keepsTurn,
    winner,
    message,
  };
}

