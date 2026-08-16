import Router from 'express';
import {verifyJWT, optionalVerifyJWT} from '../middlewares/auth.middleware.js';
import { 
    createPlaylist, 
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    getMyPlaylists,
    getUserPlaylists,
    getPlaylistById,
    togglePlaylistVisibility
 } from '../controllers/playlist.controller.js';

const router = Router();

router.route('/me').get(verifyJWT, getMyPlaylists);
router.route('/:playlistId').get(optionalVerifyJWT, getPlaylistById);
router.route('/user/:username').get(getUserPlaylists);

router.use(verifyJWT);

router.route('/').post(createPlaylist);
router.route('/:playlistId').delete(deletePlaylist);
router.route('/:playlistId/videos/:videoId').post(addVideoToPlaylist).delete(removeVideoFromPlaylist);
router.route('/:playlistId/visibility').patch(togglePlaylistVisibility);

export default router;